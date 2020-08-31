import {ContractArtifacts} from '@statechannels/nitro-protocol';
import {providers, Wallet, Contract, BigNumber} from 'ethers';
import PriorityQueue from 'p-queue';

import {Wallet as ChannelWallet} from '../wallet';
import {Address, Bytes32} from '../type-aliases';

const BAD_NONCE = "the tx doesn't have the correct nonce";
const INVALID_NONCE = 'Invalid nonce';
const NO_TX_HASH = 'no transaction hash found in tx response';
const UNDERPRICED_REPLACEMENT = 'replacement transaction underpriced';
const DEFAULT_MAX_RETRIES = 5;
const KNOWN_ERRORS = [BAD_NONCE, NO_TX_HASH, UNDERPRICED_REPLACEMENT, INVALID_NONCE];

type OnchainServiceEnvironment = {
  provider: string | providers.JsonRpcProvider;
  wallet: string | Wallet; // Private key or wallet to send tx
  transactionRetries?: number; // Maximum number of times a tx is retried
};

// This is used instead of the ethers `Transaction` because that type
// requires the nonce and chain ID to be specified, when sometimes those
// arguments are not known at the time of creating a transaction.
type MinimalTransaction = {
  to: Address;
  value: string;
  data: string;
};

export interface OnchainServiceInterface {
  // NOTE: will return void and throw an error in final implementation
  registerChannel(
    channelId: Bytes32,
    assetHolders: Address[],
    assetIds: string[]
  ): Promise<string | undefined>;
  submitTransaction(
    channelId: Bytes32,
    tx: MinimalTransaction
  ): Promise<providers.TransactionResponse>;

  // TODO: remove in v1
  attachChannelWallet(wallet: ChannelWallet): void;
}

export class OnchainService implements OnchainServiceInterface {
  private provider: providers.JsonRpcProvider;
  private wallet: Wallet;
  private retries: number;

  // NOTE: V0 has an in-memory store, which will eventually be
  // shifted to more permanent storage
  // Holds latest channel event by type (i.e. { "fundsDeposited": {...} })
  private store: Map<string, object> = new Map();

  // Stores references to all contracts in memory
  private assetHolders: Map<string, Contract> = new Map();

  // Stores references to assetIds in memory
  private assetHolderToId: Map<string, string | undefined> = new Map();

  // Transaction queue
  private queue = new PriorityQueue({concurrency: 1});

  // Memory tracking wallet nonce to assist with retries
  private memoryNonce = 0;

  // TODO: Remove reference to this object, and instead replace with
  // outbox based communication. Right now used to call correct callbacks
  private channelWallet: ChannelWallet | undefined = undefined;

  constructor(env: OnchainServiceEnvironment) {
    this.retries = env.transactionRetries || DEFAULT_MAX_RETRIES;
    this.provider =
      typeof env.provider === 'string' ? new providers.JsonRpcProvider(env.provider) : env.provider;
    this.wallet =
      typeof env.wallet === 'string'
        ? new Wallet(env.wallet, this.provider)
        : (env.wallet as Wallet).connect(this.provider);
  }

  public attachChannelWallet(wallet: ChannelWallet): void {
    this.channelWallet = wallet;
  }

  /**
   * Adds a channel to watch events and submit transactions for
   *
   * @param channelId Unique channel identifier to register chain listeners for
   * @param assetHolders Onchain addresses of the channel chain context
   * @returns String if there is an error, undefined if successful
   */
  public registerChannel(
    channelId: Bytes32,
    assetHolders: Address[],
    assetIds: string[]
  ): Promise<string | undefined> {
    if (!this.channelWallet) {
      throw new Error(
        'Must attach channel wallet before registering channel, this will go away in v1'
      );
    }

    // If the channel has already been registered, return
    if (this.store.has(channelId)) {
      return Promise.resolve(undefined);
    }

    // Create and store new contracts if we don't have record of
    // required assetHolders
    assetHolders.forEach((assetHolder, idx) => {
      if (this.assetHolders.has(assetHolder)) {
        return;
      }
      // TODO: Use the AssetHolder abi?
      const contract = new Contract(
        assetHolder,
        ContractArtifacts.EthAssetHolderArtifact.abi,
        this.provider
      );
      this._registerAssetHolderCallbacks(contract);
      this.assetHolders.set(assetHolder, contract);
      this.assetHolderToId.set(assetHolder, assetIds[idx]);
    });

    // Add the channel to service storage
    this.store.set(channelId, {assetHolders, events: {}});

    return Promise.resolve(undefined);
  }

  public async submitTransaction(
    channelId: Bytes32,
    tx: MinimalTransaction
  ): Promise<providers.TransactionResponse> {
    if (!this.channelWallet) {
      throw new Error(
        'Must attach channel wallet before registering channel, this will go away in v1'
      );
    }

    // If the channel is not registered, do not send transactions
    if (!this.store.has(channelId)) {
      throw new Error(`Channel is not registered ${channelId}`);
    }

    // Create the errors object
    const errors: {[k: number]: string} = {};
    for (let attempt = 1; attempt < this.retries; attempt += 1) {
      try {
        const response = await this.queue.add(() => this._sendTransaction(tx));
        return response;
      } catch (e) {
        // Store error
        errors[attempt] = e.message;

        // Only retry if it is a known error
        const knownErr = KNOWN_ERRORS.find(err => e.message.includes(err));
        if (!knownErr) {
          throw new Error(
            `Transaction failed to send with unknown error on attempt ${attempt}/5: ${JSON.stringify(
              errors
            )}`
          );
        }
      }
    }
    throw new Error(`Unable to send transaction after 5 retries: ${JSON.stringify(errors)}`);
  }

  private async _sendTransaction(tx: MinimalTransaction): Promise<providers.TransactionResponse> {
    // Get the onchain record of wallet nonce
    const chainNonce = await this.wallet.getTransactionCount();

    // Use higher of chain or memory nonce
    const nonce = this.memoryNonce > chainNonce ? this.memoryNonce : chainNonce;

    // TODO: should we set gas minimums or preferences?

    // Send the transaction
    const response = await this.wallet.sendTransaction(tx);
    if (!response.hash) {
      throw new Error(NO_TX_HASH);
    }

    // Update the memory nonce after sent to mempool
    this.memoryNonce = nonce + 1;
    return response;
  }

  // NOTE: could also do this in the `wait` callback in `submitTransaction`
  // but would need more information about what event to parse from the
  // receipt via the API
  private _registerAssetHolderCallbacks(assetHolder: Contract): void {
    assetHolder.on(
      'Deposited',
      (destination: string, amountDeposited: BigNumber, destinationHoldings: BigNumber) => {
        if (!this.channelWallet) {
          throw new Error(
            'Must attach channel wallet before registering channel, this will go away in v1'
          );
        }

        // Get the destination record
        const record = this.store.get(destination);

        // If there is no channel registered at destination, ignore event
        if (!record) {
          return;
        }
        const updated = {
          ...record,
          ['Deposited']: {
            destination,
            amountDeposited,
            destinationHoldings,
          },
        };
        this.store.set(destination, updated);
        // Call the appropriate callback on the wallet
        this.channelWallet.updateChannelFunding({
          channelId: destination,
          amount: amountDeposited.toString(),
          token: this.assetHolderToId.get(assetHolder.address),
        });
      }
    );
  }
}
