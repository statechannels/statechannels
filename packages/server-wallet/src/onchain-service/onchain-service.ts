import {ContractArtifacts} from '@statechannels/nitro-protocol';
import {Bytes32} from '@statechannels/client-api-schema';
import {providers, Contract, BigNumber} from 'ethers';

import {
  MinimalTransaction,
  OnchainServiceInterface,
  AssetHolderInformation,
  OnchainServiceConfiguration,
  TransactionSubmissionServiceInterface,
  DEFAULT_MAX_TRANSACTION_ATTEMPTS,
} from './types';

// FIXME: replace with
// import {Wallet as ChannelWallet, WalletError as ChannelWalletError} from '@statechannels/server-wallet';
import {Wallet as ChannelWallet, WalletError as ChannelWalletError} from '..';

type Values<E> = E[keyof E];

class OnchainServiceError extends ChannelWalletError {
  readonly type = ChannelWalletError.errors.OnchainError;

  // Reasons an error is thrown from the transaction submission
  // service
  static readonly reasons = {
    notRegistered: 'Must call register channel',
    noChannelWallet: 'Must attach channel wallet',
  } as const;
  constructor(
    reason: Values<typeof OnchainServiceError.reasons>,
    public readonly data: any = undefined
  ) {
    super(reason);
  }
}

export class OnchainService implements OnchainServiceInterface {
  private provider: providers.JsonRpcProvider;
  private attempts: number;

  // NOTE: V0 has an in-memory store, which will eventually be
  // shifted to more permanent storage
  // Holds latest channel event by type (i.e. { "fundsDeposited": {...} })
  private store: Map<string, object> = new Map();

  // Stores references to all contracts in memory
  private assetHolders: Map<string, AssetHolderInformation & {contract: Contract}> = new Map();

  // TODO: Remove reference to this object, and instead replace with
  // outbox based communication. Right now used to call correct callbacks
  private channelWallet: ChannelWallet | undefined = undefined;

  // Handles the actual submission of the transactions to chain
  private transactionSubmissionService: TransactionSubmissionServiceInterface;

  constructor(
    provider: string | providers.JsonRpcProvider,
    transactionSubmissionService: TransactionSubmissionServiceInterface,
    config: OnchainServiceConfiguration = {}
  ) {
    this.attempts = config.transactionAttempts || DEFAULT_MAX_TRANSACTION_ATTEMPTS;
    if (this.attempts === 0) {
      throw new Error(`Invalid number of attempts (${this.attempts})`);
    }
    this.provider =
      typeof provider === 'string' ? new providers.JsonRpcProvider(provider) : provider;
    this.transactionSubmissionService = transactionSubmissionService;
  }

  public attachChannelWallet(wallet: ChannelWallet): void {
    this.channelWallet = wallet;
  }

  /**
   * Adds a channel to watch events and submit transactions for
   *
   * @param channelId Unique channel identifier to register chain listeners for
   * @param assetHolders Onchain addresses of the channel chain context
   * @returns an empty promise that will resolve once the channel is registered
   */
  public registerChannel(
    channelId: Bytes32,
    assetHolders: AssetHolderInformation[]
  ): Promise<void> {
    if (!this.channelWallet) {
      throw new OnchainServiceError(OnchainServiceError.reasons.noChannelWallet);
    }

    // If the channel has already been registered, return
    if (this.store.has(channelId)) {
      return Promise.resolve();
    }

    // FIXME: get the token address (if applicable) from the AssetHolder

    // Create and store new contracts if we don't have record of
    // required assetHolders
    assetHolders.forEach(assetHolder => {
      if (this.assetHolders.has(assetHolder.assetHolderAddress)) {
        return;
      }
      const contract = new Contract(
        assetHolder.assetHolderAddress,
        ContractArtifacts.AssetHolderArtifact.abi,
        this.provider
      );
      this._registerAssetHolderCallbacks(contract);
      this.assetHolders.set(assetHolder.assetHolderAddress, {...assetHolder, contract});
    });

    // Add the channel to service storage
    this.store.set(channelId, {assetHolders, events: {}});

    return Promise.resolve();
  }

  public async submitTransaction(
    channelId: Bytes32,
    tx: MinimalTransaction
  ): Promise<providers.TransactionResponse> {
    if (!this.channelWallet) {
      throw new OnchainServiceError(OnchainServiceError.reasons.noChannelWallet);
    }

    // If the channel is not registered, do not send transactions
    if (!this.store.has(channelId)) {
      throw new OnchainServiceError(OnchainServiceError.reasons.notRegistered);
    }

    return this.transactionSubmissionService.submitTransaction(tx, {
      maxSendAttempts: this.attempts,
    });
  }

  // NOTE: could also do this in the `wait` callback in `submitTransaction`
  // but would need more information about what event to parse from the
  // receipt via the API
  private _registerAssetHolderCallbacks(assetHolder: Contract): void {
    assetHolder.on(
      'Deposited',
      (destination: string, amountDeposited: BigNumber, destinationHoldings: BigNumber) => {
        if (!this.channelWallet) {
          throw new OnchainServiceError(OnchainServiceError.reasons.noChannelWallet);
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
          token: this.assetHolders.get(assetHolder.address)?.tokenAddress,
        });
      }
    );
  }
}
