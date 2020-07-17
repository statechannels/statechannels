import {utils, constants} from 'ethers';
import {
  FakeChannelProvider,
  ChannelClient,
  ChannelClientInterface,
  ErrorCode
} from '@statechannels/channel-client';
import {
  ChannelStatus,
  Message,
  Participant,
  ChannelResult,
  AllocationItem,
  Allocations
} from '@statechannels/client-api-schema';
import {DomainBudget} from '@statechannels/client-api-schema';
import {
  SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS,
  HUB,
  FIREBASE_PREFIX,
  fireBaseConfig,
  FUNDING_STRATEGY,
  INITIAL_BUDGET_AMOUNT
} from '../constants';
import {AddressZero} from 'ethers/constants';
import * as firebase from 'firebase/app';
import 'firebase/database';
import {map, filter, first} from 'rxjs/operators';
import {logger} from '../logger';
import {concat, of, Observable} from 'rxjs';
import _ from 'lodash';

const log = logger.child({module: 'payment-channel-client'});
const hexZeroPad = utils.hexZeroPad;

function sanitizeMessageForFirebase(message) {
  return JSON.parse(JSON.stringify(message));
}

const bigNumberify = utils.bigNumberify;
const FINAL_SETUP_STATE = utils.bigNumberify(3); // for a 2 party ForceMove channel
const APP_DATA = constants.HashZero; // unused in the SingleAssetPaymentApp

export interface Peer {
  signingAddress: string;
  outcomeAddress: string;
  balance: string;
}
export type Peers = {beneficiary: Peer; payer: Peer};

export const peer = (
  signingAddress: string,
  outcomeAddress: string,
  balance: string | number
): Peer => ({
  signingAddress,
  outcomeAddress,
  balance: utils.bigNumberify(balance).toHexString()
});
export interface ChannelState {
  channelId: string;
  turnNum: utils.BigNumber;
  status: ChannelStatus;
  challengeExpirationTime;
  beneficiary: Peer;
  payer: Peer;
}

enum Index {
  Payer = 1,
  Beneficiary = 0
}

const convertToChannelState = (channelResult: ChannelResult): ChannelState => {
  const {
    turnNum,
    channelId,
    participants,
    allocations,
    challengeExpirationTime,
    status
  } = channelResult;

  return {
    channelId,
    turnNum: utils.bigNumberify(turnNum),
    status,
    challengeExpirationTime,
    beneficiary: peer(
      participants[Index.Beneficiary].participantId,
      participants[Index.Beneficiary].destination,
      allocations[0].allocationItems[Index.Beneficiary].amount
    ),
    payer: peer(
      participants[Index.Payer].participantId,
      participants[Index.Payer].destination,
      allocations[0].allocationItems[Index.Payer].amount
    )
  };
};

/**
 *
 * @param peers: Peers
 * Arranges peers in order, as determined by the Index enum.
 */
const arrangePeers = ({beneficiary, payer}: Peers): [Peer, Peer] => {
  const peers: [Peer, Peer] = [undefined, undefined];
  peers[Index.Payer] = payer;
  peers[Index.Beneficiary] = beneficiary;

  return peers;
};

const formatParticipant = ({signingAddress, outcomeAddress}: Peer): Participant => ({
  participantId: signingAddress,
  signingAddress,
  destination: outcomeAddress
});
const formatParticipants = (peers: Peers) => arrangePeers(peers).map(formatParticipant);

const formatItem = (p: Peer): AllocationItem => ({
  amount: hexZeroPad(bigNumberify(p.balance).toHexString(), 32),
  destination: p.outcomeAddress
});
const formatAllocations = (peers: Peers): Allocations => [
  {token: AddressZero, allocationItems: arrangePeers(peers).map(formatItem)}
];

const subtract = (a: string, b: string) =>
  hexZeroPad(
    bigNumberify(a)
      .sub(bigNumberify(b))
      .toHexString(),
    32
  );

const add = (a: string, b: string) =>
  hexZeroPad(
    bigNumberify(a)
      .add(bigNumberify(b))
      .toHexString(),
    32
  );

// This class wraps the channel client converting the
// request/response formats to those used in the app

if (process.env.FAKE_CHANNEL_PROVIDER === 'true') {
  window.channelProvider = new FakeChannelProvider();
} else {
  // TODO: Replace with injection via other means than direct app import
  // NOTE: This adds `channelProvider` to the `Window` object
  require('@statechannels/channel-provider');
}

export type ChannelCache = Record<string, ChannelState | undefined>;

// This Client targets at _unidirectional_, single asset (ETH) payment channel with 2 participants running on Nitro protocol
// The beneficiary proposes the channel, but accepts payments
// The payer joins the channel, and makes payments
export class PaymentChannelClient {
  channelCache: ChannelCache = {};
  budgetCache?: DomainBudget;
  channelsWaitingToClose: Record<string, boolean | undefined> = {};

  _enabled = false;
  get enabled(): boolean {
    return this._enabled;
  }
  get mySigningAddress(): string | undefined {
    return this.channelClient.signingAddress;
  }

  get myDestinationAddress(): string | undefined {
    return this.channelClient.destinationAddress;
  }

  constructor(readonly channelClient: ChannelClientInterface) {
    this.channelStates.subscribe(channelResult => this.updateChannelCache(channelResult));

    this.channelClient.onBudgetUpdated(budgetResult => {
      this.budgetCache = budgetResult;
    });
  }

  async initialize() {
    await this.channelClient.provider.mountWalletComponent(process.env.WALLET_URL);
    await this.initializeHubComms();
  }

  async enable() {
    log.debug('enabling payment channel client');

    await this.channelClient.provider.enable();

    log.debug('payment channel client enabled');

    const doesBudgetExist = async () => {
      const budget = await this.getBudget();
      return !!budget && !_.isEmpty(budget);
    };

    if (FUNDING_STRATEGY !== 'Direct' && !(await doesBudgetExist())) {
      // TODO: This only checks if a budget exists, not if we have enough funds in it
      log.debug('Virtual Funding - Creating Budget');
      await this.createBudget(INITIAL_BUDGET_AMOUNT);
    }
    this._enabled = true;
  }

  private initializeHubComms() {
    if (!fireBaseConfig) {
      log.error('Abandoning firebase setup, configuration is undefined');
      return;
    }

    if (firebase.apps.length > 0) {
      log.warn('Firebase app already initialized');
    } else {
      // Hub messaging
      firebase.initializeApp(fireBaseConfig);
      const myFirebaseRef = firebase
        .database()
        .ref(`/${FIREBASE_PREFIX}/messages/${this.mySigningAddress}`);
      const hubFirebaseRef = firebase
        .database()
        .ref(`/${FIREBASE_PREFIX}/messages/${HUB.participantId}`);

      // firebase setup
      myFirebaseRef.onDisconnect().remove();

      this.onMessageQueued((message: Message) => {
        if (message.recipient === HUB.participantId) {
          hubFirebaseRef.push(sanitizeMessageForFirebase(message));
        }
      });

      myFirebaseRef.on('child_added', async snapshot => {
        const key = snapshot.key;
        const message = snapshot.val();
        myFirebaseRef.child(key).remove();
        log.debug({message}, 'GOT FROM FIREBASE: ');
        await this.pushMessage(message);
      });
    }
  }

  async createChannel(peers: Peers): Promise<ChannelState> {
    const channelResult = await this.channelClient.createChannel(
      formatParticipants(peers),
      formatAllocations(peers),
      SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS,
      APP_DATA,
      FUNDING_STRATEGY
    );

    const channelState = convertToChannelState(channelResult);
    this.insertIntoChannelCache(channelState);
    return channelState;
  }

  onMessageQueued(callback: (message: Message) => void) {
    return this.channelClient.onMessageQueued(callback);
  }

  insertIntoChannelCache(channelState: ChannelState) {
    this.channelCache[channelState.channelId] = channelState;
  }

  updateChannelCache(channelState: ChannelState) {
    this.channelCache[channelState.channelId] && // only update an existing key
      (this.channelCache[channelState.channelId] = channelState);
  }

  // Accepts an payment-channel-friendly callback, performs the necessary encoding, and subscribes to the channelClient with an appropriate, API-compliant callback
  onChannelUpdated(web3tCallback: (channelState: ChannelState) => any) {
    return this.channelClient.onChannelUpdated(async cr => {
      const channelState = convertToChannelState(cr);

      // if we're waiting to close, have a try - we want to get in before anyone else is notified
      if (this.waitingToClose(cr.channelId) && this.canCancelChannel(channelState)) {
        await this.attemptToInitiateClose(cr.channelId);
      }

      web3tCallback(channelState);
    });
  }

  onChannelProposed(web3tCallback: (channelState: ChannelState) => any) {
    return this.channelClient.onChannelProposed(cr => web3tCallback(convertToChannelState(cr)));
  }

  async joinChannel(channelId: string) {
    const channelResult = await this.channelClient.joinChannel(channelId);
    this.insertIntoChannelCache(convertToChannelState(channelResult));
  }

  private async attemptToInitiateClose(channelId: string) {
    try {
      await this.channelClient.closeChannel(channelId);
    } catch (error) {
      if (error.error.code === ErrorCode.CloseChannel.NotYourTurn) {
        logger.warn({channelId}, 'Tried to close but not your turn. Waiting instead');
      } else {
        logger.error({error}, 'Unexpected error');
        throw error;
      }
    }
  }

  async closeChannel(channelId: string): Promise<ChannelState> {
    this.setWaitingToClose(channelId);

    // attempt to initiate close
    await this.attemptToInitiateClose(channelId);

    // and then wait until closed
    return this.channelState(channelId)
      .pipe(first(cs => cs.status === 'closed'))
      .toPromise();
  }

  async blockUntilClosed(channelId: string): Promise<ChannelState> {
    return this.channelState(channelId)
      .pipe(first(cs => cs.status === 'closed'))
      .toPromise();
  }

  async challengeChannel(channelId: string): Promise<ChannelState> {
    const channelResult = await this.channelClient.challengeChannel(channelId);
    this.updateChannelCache(convertToChannelState(channelResult));
    return convertToChannelState(channelResult);
  }

  async updateChannel(channelId: string, peers: Peers): Promise<ChannelState> {
    const channelResult = await this.channelClient.updateChannel(
      channelId,
      formatAllocations(peers),
      APP_DATA
    );

    const channelState = convertToChannelState(channelResult);
    this.updateChannelCache(channelState);
    return channelState;
  }

  /**
   *
   * Returns true for channel states where, according to the payment channel client's mySigningAddress,
   * - the channel is still 'running'
   * - it's my turn to move
   */
  private canUpdateChannel(state: ChannelState): boolean {
    return state.status === 'running' && this.isMyTurn(state);
  }

  private canCancelChannel(state: ChannelState): boolean {
    return (
      this.isMyTurn(state) &&
      (state.status === 'proposed' ||
        state.status === 'opening' ||
        state.status === 'funding' ||
        state.status === 'running')
    );
  }

  private isMyTurn(state: ChannelState): boolean {
    const {payer, beneficiary} = state;
    let myRole: Index;
    if (payer.signingAddress === this.mySigningAddress) myRole = Index.Payer;
    else if (beneficiary.signingAddress === this.mySigningAddress) myRole = Index.Beneficiary;
    else throw 'Not in channel';

    return state.turnNum
      .add(1)
      .mod(2)
      .eq(myRole);
  }

  get channelStates() {
    return this.channelClient.channelState.pipe(map(convertToChannelState));
  }

  channelState(channelId): Observable<ChannelState> {
    const newStates = this.channelClient.channelState.pipe(
      filter(cr => cr.channelId === channelId),
      map(convertToChannelState)
    );

    return this.channelCache[channelId]
      ? concat(of(this.channelCache[channelId]), newStates)
      : newStates;
  }

  // payer may use this method to make payments (if they have sufficient funds)
  async makePayment(channelId: string, amount: string) {
    let amountWillPay = amount;
    // First, wait for my turn
    const {payer, beneficiary} = await this.channelState(channelId)
      .pipe(first(cs => this.canUpdateChannel(cs)))
      .toPromise();

    if (bigNumberify(payer.balance).eq(0)) {
      logger.error('Out of funds. Closing channel.');
      await this.closeChannel(channelId);
      return;
    }

    if (bigNumberify(payer.balance).lt(amount)) {
      amountWillPay = payer.balance;
      logger.debug({amountAskedToPay: amount, amountWillPay}, 'Paying less than PEER_TRUST');
    }

    try {
      await this.updateChannel(channelId, {
        beneficiary: {...beneficiary, balance: add(beneficiary.balance, amountWillPay)},
        payer: {...payer, balance: subtract(payer.balance, amountWillPay)}
      });
    } catch (error) {
      if (error.error.code === ErrorCode.UpdateChannel.NotYourTurn) {
        logger.warn({channelId}, 'Possible race condition detected');
      } else {
        logger.error({error}, 'makePayment: Unexpected error');
      }
    }
  }

  // beneficiary may use this method to accept payments
  async acceptChannelUpdate(channelState: ChannelState) {
    const {channelId, beneficiary, payer} = channelState;
    await this.updateChannel(channelId, {beneficiary, payer});
  }

  amProposer(channelIdOrChannelState: string | ChannelState): boolean {
    if (typeof channelIdOrChannelState === 'string') {
      return (
        this.channelCache[channelIdOrChannelState]?.beneficiary.signingAddress ===
        this.mySigningAddress
      );
    } else {
      return channelIdOrChannelState.beneficiary.signingAddress === this.mySigningAddress;
    }
  }

  isPaymentToMe(channelState: ChannelState): boolean {
    // doesn't guarantee that my balance increased
    if (channelState.beneficiary.signingAddress === this.mySigningAddress) {
      return channelState.status === 'running' && channelState.turnNum.mod(2).eq(1);
    }
    return false; // only beneficiary may receive payments
  }

  shouldSendSpacerState(channelState: ChannelState): boolean {
    return this.amProposer(channelState) && channelState.turnNum.eq(FINAL_SETUP_STATE);
  }

  async pushMessage(message: Message) {
    await this.channelClient.pushMessage(message);
  }

  async createBudget(amount: string) {
    try {
      this.budgetCache = await this.channelClient.approveBudgetAndFund(
        amount,
        amount,
        HUB.signingAddress,
        HUB.outcomeAddress
      );
    } catch (e) {
      if (e.message === 'User declined') {
        log.debug('User declined budget creation');
        return;
      } else {
        throw e;
      }
    }
  }

  async getChannels(): Promise<ChannelCache> {
    const channelResults = await this.channelClient.getChannels(false);
    channelResults.map(convertToChannelState).forEach(cr => (this.channelCache[cr.channelId] = cr));
    return this.channelCache;
  }

  async getBudget(): Promise<DomainBudget> {
    this.budgetCache = await this.channelClient.getBudget(HUB.signingAddress);
    return this.budgetCache;
  }

  async closeAndWithdraw(): Promise<DomainBudget | {}> {
    try {
      await this.channelClient.closeAndWithdraw(HUB.signingAddress, HUB.outcomeAddress);
    } catch (e) {
      if (e.message === 'User declined') {
        log.debug('User declined withdrawal');
        return this.budgetCache;
      } else {
        throw e;
      }
    }

    this.budgetCache = undefined;
    return this.budgetCache;
  }

  private setWaitingToClose(channelId: string) {
    this.channelsWaitingToClose[channelId] = true;
  }

  private waitingToClose(channelId: string): boolean {
    return !!this.channelsWaitingToClose[channelId];
  }
}

export const paymentChannelClient = new PaymentChannelClient(
  new ChannelClient(window.channelProvider)
);
