import {ContractArtifacts} from '@statechannels/nitro-protocol';
import {Bytes32, Address} from '@statechannels/client-api-schema';
import {providers, Contract, BigNumber, Event, constants} from 'ethers';
import {Evt} from 'evt';
import {BN} from '@statechannels/wallet-core';

import {logger} from '../logger';

import {
  MinimalTransaction,
  OnchainServiceInterface,
  AssetHolderInformation,
  TransactionSubmissionServiceInterface,
  EvtContainer,
  ContractEventName,
  ChannelEventRecordMap,
  TransactionSubmissionOptions,
  OnchainServiceStoreInterface,
  ChannelDepositedEventRecord,
} from './types';
import {addEvtHandler, BaseError} from './utils';

// FIXME: replace with
// import {Wallet as ChannelWallet, WalletError as ChannelWalletError} from '@statechannels/server-wallet';
import {Wallet as ChannelWallet} from '..';

type Values<E> = E[keyof E];

const getAssetHolderInformation = async (
  assetHolderAddress: Address,
  provider: providers.JsonRpcProvider
): Promise<AssetHolderInformation> => {
  // Even though we do not know if this is an ETH or ERC20 asset holder,
  // we must instantiate the contract with the Erc20AssetHolderArtifact
  // because it is the only one with the `Token` property within the abi
  const assetHolder = new Contract(
    assetHolderAddress,
    ContractArtifacts.Erc20AssetHolderArtifact.abi,
    provider
  );
  let tokenAddress: string;
  try {
    tokenAddress = await assetHolder.Token();
  } catch (e) {
    // Failed to get property, means this is an ETH asset holder
    tokenAddress = constants.AddressZero;
  }
  return {tokenAddress, assetHolderAddress};
};

class OnchainServiceError extends BaseError {
  readonly type = BaseError.errors.OnchainError;

  static readonly knownErrors = {} as const;

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
    super(reason, data);
    logger.error(reason, {type: this.type, ...(data || {})});
  }
}

export class OnchainService implements OnchainServiceInterface {
  private provider: providers.JsonRpcProvider;

  // Storage for all events
  private storage: OnchainServiceStoreInterface;

  // Stores references to all contracts in memory
  private assetHolders: Map<string, AssetHolderInformation & {evts: EvtContainer}> = new Map();

  // TODO: Remove reference to this object, and instead replace with
  // outbox based communication. Right now used to call correct callbacks
  private channelWallet: ChannelWallet | undefined = undefined;

  // Handles the actual submission of the transactions to chain
  private transactionSubmissionService: TransactionSubmissionServiceInterface;

  constructor(
    provider: string | providers.JsonRpcProvider,
    transactionSubmissionService: TransactionSubmissionServiceInterface,
    storage: OnchainServiceStoreInterface
  ) {
    this.provider =
      typeof provider === 'string' ? new providers.JsonRpcProvider(provider) : provider;
    this.transactionSubmissionService = transactionSubmissionService;
    this.storage = storage;
    logger.log('OnchainService created');
  }

  public attachChannelWallet(wallet: ChannelWallet): void {
    this.channelWallet = wallet;
    logger.log('Attached ChannelWallet');
  }

  /**
   * Attaches a callback to the specified event from the specified AssetHolder
   * contract
   * @param assetHolderAddr Address of AssetHolder
   * @param event Event name
   * @param callback Handler for event
   * @param filter Filter on events (handler only called if this returns true)
   * @param timeout If included, returns a promise that resolves when event is
   * thrown or rejects if nothing is detected within the timeout window
   * @returns a promise resolving to the event (if timeout provided), or an evt
   * instance
   *
   * @notice This may not be strictly necessary, but could be useful for the app
   */
  public attachHandler<T extends ContractEventName>(
    assetHolderAddr: Address,
    event: T,
    callback: (event: ChannelEventRecordMap[T]) => void | Promise<void>,
    filter?: (event: ChannelEventRecordMap[T]) => boolean,
    timeout?: number
  ): Evt<ChannelEventRecordMap[T]> | Promise<ChannelEventRecordMap[T]> {
    const record = this.assetHolders.get(assetHolderAddr);
    if (!record) {
      throw new Error(`Could not find asset holder with service`);
    }

    const evt = record.evts[event];
    if (!evt) {
      throw new Error(`${event} not handled`);
    }

    // EVT api changes based on the presence of arguments
    return addEvtHandler(evt, callback, filter, timeout);
  }

  /**
   * Detaches all handlers from the evt instance for the given asset holder
   * and event (if provided)
   * @param assetHolderAddr Contract address of Asset Holder
   * @param event Event to remove handlers from
   *
   * @notice This may not be strictly necessary, but is useful for testing
   */
  public detachAllHandlers(assetHolderAddr: Address, event?: ContractEventName): void {
    const record = this.assetHolders.get(assetHolderAddr);
    if (!record) {
      throw new Error(`Could not find asset holder with service`);
    }

    // Only detach handlers from one event if specified
    if (event) {
      record.evts[event].detach();
      logger.log(`Detached ${event} handlers`, {
        assetHolderAddress: record.assetHolderAddress,
        tokenAddress: record.tokenAddress,
      });
      return;
    }

    // Remove all handlers (user and default)
    Object.values(record.evts).map(evt => {
      evt.detach();
    });
    logger.log(`Detached all handlers`, {
      assetHolderAddress: record.assetHolderAddress,
      tokenAddress: record.tokenAddress,
    });
  }

  /**
   * Adds a channel to watch events and submit transactions for
   *
   * @param channelId Unique channel identifier to register chain listeners for
   * @param assetHolders Onchain addresses of the channel chain context
   * @returns an empty promise that will resolve once the channel is registered
   */
  public async registerChannel(channelId: Bytes32, assetHolders: Address[]): Promise<void> {
    if (!this.channelWallet) {
      throw new OnchainServiceError(OnchainServiceError.reasons.noChannelWallet);
    }

    // Add the channel if it has not been stored
    // Store can handle multiple creation calls
    await this.storage.createChannel(channelId);

    // Create and store new contracts if we don't have record of
    // required assetHolders
    await Promise.all(
      assetHolders.map(async assetHolderAddr => {
        // If the contract has already been registered, continue
        if (this.assetHolders.has(assetHolderAddr)) {
          return;
        }

        // Get asset holder information from chain
        const info = await getAssetHolderInformation(assetHolderAddr, this.provider);
        this._registerAssetHolderCallbacks(info);
      })
    );
    logger.log(`Registered channel`, {
      channelId,
      assetHolders,
    });
  }

  public async submitTransaction(
    channelId: Bytes32,
    tx: MinimalTransaction,
    transactionOptions: TransactionSubmissionOptions = {maxSendAttempts: 5}
  ): Promise<providers.TransactionResponse> {
    if (!this.channelWallet) {
      throw new OnchainServiceError(OnchainServiceError.reasons.noChannelWallet);
    }

    // If the channel is not registered, do not send transactions
    if (!this.storage.hasChannel(channelId)) {
      throw new OnchainServiceError(OnchainServiceError.reasons.notRegistered);
    }

    return this.transactionSubmissionService.submitTransaction(channelId, tx, transactionOptions);
  }

  private _createDepositEvt(): Evt<ChannelDepositedEventRecord> {
    // Create the evt instances for the contract
    const depositEvt = Evt.create<ChannelDepositedEventRecord>();

    // Setup deposit evt so it will emit properly formatted event IFF
    // - belongs to a registered channel
    // - is for a subsequent deposit event
    // And execute channel wallet and storage callbacks (wallet callback
    // executed IFF a channel wallet has been attached to the service)

    // FIXME: evt pipe isnt async supported :(
    depositEvt
      .pipe(e => {
        return this.storage.hasChannel(e.destination);
      })
      .pipe(e => {
        const record = this.storage.getLatestEvent(e.destination, 'Deposited');
        const prevHoldings = record?.destinationHoldings || BigNumber.from(0);
        return prevHoldings.lt(e.destinationHoldings);
      })
      .attach(e => {
        this.storage.saveEvent(e.destination, e);
      });

    logger.debug(`Created deposit evt`);
    return depositEvt;
  }

  // NOTE: could also do this in the `wait` callback in `submitTransaction`
  // but would need more information about what event to parse from the
  // receipt via the API
  private _registerAssetHolderCallbacks(info: AssetHolderInformation): void {
    // Create the evt instances for the contract
    const depositEvt = this._createDepositEvt();

    // Attach the wallet callback
    depositEvt.attach(e => {
      // Call the appropriate callback on the wallet
      this.channelWallet &&
        this.channelWallet.updateChannelFunding({
          channelId: e.destination,
          amount: BN.from(e.amountDeposited),
          token: info.tokenAddress,
        });
    });

    // Post to evt on every onchain deposit event
    const contract = new Contract(
      info.assetHolderAddress,
      info.tokenAddress === constants.AddressZero
        ? ContractArtifacts.EthAssetHolderArtifact.abi
        : ContractArtifacts.Erc20AssetHolderArtifact.abi,
      this.provider
    );
    contract.on(
      'Deposited',
      (
        destination: string,
        amountDeposited: BigNumber,
        destinationHoldings: BigNumber,
        event: Event
      ) => {
        depositEvt.post({
          destination,
          amountDeposited,
          destinationHoldings,
          block: event.blockNumber,
          type: 'Deposited',
        });
      }
    );

    // Store the information and emitters in mapping
    const evts = {Deposited: depositEvt};
    this.assetHolders.set(info.assetHolderAddress, {...info, evts});
    logger.debug(`Registered AssetHolder callbacks`, info);
  }
}
