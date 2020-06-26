import {Store} from '../store';
import {MessagingServiceInterface} from '../messaging';
import {ChannelStoreEntry} from '../store/channel-store-entry';
import {AppRequestEvent, CreateChannelEvent, JoinChannelEvent} from '../event-types';
import {BigNumber} from 'ethers';
import {serializeChannelEntry} from '../serde/app-messages/serialize';
import {CHAIN_NETWORK_ID} from '../config';
import {unreachable} from '../utils';

export class ChannelManager {
  constructor(
    public channelId: string,
    private store: Store,
    private messagingService: MessagingServiceInterface
  ) {
    this.store.channelUpdatedFeed(channelId).subscribe(snapshot => this.handleUpdate(snapshot));
    this.messagingService.channelRequestFeed(channelId).subscribe(req => this.handleRequest(req));
  }

  static async fromCreateRequest(
    req: CreateChannelEvent,
    store: Store,
    messagingService: MessagingServiceInterface
  ) {
    const {
      participants,
      outcome,
      appDefinition,
      appData,
      challengeDuration,
      chainId,
      requestId,
      applicationDomain,
      fundingStrategy
    } = req;
    if (fundingStrategy !== 'Direct') {
      throw Error('Only support direct channels atm');
    }
    if (chainId !== CHAIN_NETWORK_ID) {
      throw Error(
        `ChainId passed to createChannel (${chainId}) does not match wallet (${CHAIN_NETWORK_ID})`
      );
    }
    //TODO: add confirmation step

    const stateVars = {outcome, appData, turnNum: BigNumber.from(0), isFinal: false};

    // create channel
    const {channelId} = await store.createChannel(
      participants,
      BigNumber.from(challengeDuration),
      stateVars,
      appDefinition,
      applicationDomain
    );

    // put objective in store
    await store.addObjective({
      type: 'OpenChannel',
      data: {targetChannelId: channelId, fundingStrategy},
      participants: [participants[1]]
    });

    const entry = await store.getEntry(channelId);
    messagingService.sendResponse(requestId, serializeChannelEntry(entry));

    return new ChannelManager(channelId, store, messagingService);
  }

  handleUpdate(snapshot: ChannelStoreEntry) {
    // or isChannelProposed
    if (snapshot.inPreFundSetupStage && !snapshot.isSupportedByMe) {
      this.askAppToJoinChannel(snapshot);
      return;
    }

    // if hasPreFundSetup && notFullyFunded

    // if is my turn && no transactionId
    // deposit

    if (snapshot)
      this.messagingService.sendChannelNotification(
        'ChannelUpdated',
        serializeChannelEntry(snapshot)
      );
  }

  handleRequest(request: AppRequestEvent) {
    if (!('channelId' in request)) {
      throw Error('ChannelManager passed request without channelId');
    }

    switch (request.type) {
      case 'JOIN_CHANNEL':
        this.handleJoinChannel(request);
        break;
      case 'PLAYER_STATE_UPDATE':
        break;
      case 'PLAYER_REQUEST_CHALLENGE':
        break;
      case 'PLAYER_REQUEST_CONCLUDE':
        break;
      default:
        unreachable(request);
    }
  }

  askAppToJoinChannel(snapshot: ChannelStoreEntry) {
    this.messagingService.sendChannelNotification('ChannelProposed', {
      fundingStrategy: 'Direct',
      ...serializeChannelEntry(snapshot)
    });
  }

  private async handleJoinChannel(req: JoinChannelEvent) {
    // set application domain
    await this.store.setapplicationDomain(this.channelId, req.applicationDomain);

    const snapshot = await this.store.getEntry(this.channelId);

    if (!(snapshot.inPreFundSetupStage && !snapshot.isSupportedByMe)) {
      // todo: need to return an errorResponse to the app
      throw Error('Channel not in the right state to join');
    }
    // todo: check the state is as expected
    await this.store.supportState(snapshot.latestState);
    console.log('joined the channel');

    const updatedSnapshot = await this.store.getEntry(this.channelId);
    await this.messagingService.sendResponse(req.requestId, serializeChannelEntry(updatedSnapshot));
  }
}
