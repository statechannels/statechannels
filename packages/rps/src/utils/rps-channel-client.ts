import {AppData, ChannelState, encodeAppData, decodeAppData} from '../core';
import {ChannelResult, ChannelClientInterface} from '@statechannels/channel-client';
import {RPS_ADDRESS} from '../constants';
import {bigNumberify} from 'ethers/utils';
import {Message} from '@statechannels/client-api-schema';

// This class wraps the channel client converting the request/response formats to those used in the app

export class RPSChannelClient {
  constructor(private readonly channelClient: ChannelClientInterface) {}

  async enable() {
    /* empty */
  }

  async approveBudgetAndFund(
    playerAmount: string,
    hubAmount: string,
    hubAddress: string,
    hubOutcomeAddress: string
  ) {
    await this.channelClient.approveBudgetAndFund(
      playerAmount,
      hubAmount,
      hubAddress,
      hubOutcomeAddress
    );
  }

  async createChannel(
    aAddress: string,
    bAddress: string,
    aBal: string,
    bBal: string,
    appAttrs: AppData,
    aOutcomeAddress: string = aAddress,
    bOutcomeAddress: string = bAddress
  ): Promise<ChannelState> {
    const participants = formatParticipants(aAddress, bAddress, aOutcomeAddress, bOutcomeAddress);
    const allocations = formatAllocations(aOutcomeAddress, bOutcomeAddress, aBal, bBal);
    const appDefinition = RPS_ADDRESS;
    const appData = encodeAppData(appAttrs);

    const channelResult = await this.channelClient.createChannel(
      participants,
      allocations,
      appDefinition,
      appData,
      'Direct'
    );

    return convertToChannelState(channelResult);
  }

  onMessageQueued(callback: (message: Message) => void) {
    return this.channelClient.onMessageQueued(callback);
  }

  // Accepts an rps-friendly callback, performs the necessary encoding, and subscribes to the channelClient with an appropriate, API-compliant callback
  onChannelUpdated(rpsCallback: (channelState: ChannelState) => any) {
    function callback(channelResult: ChannelResult): any {
      rpsCallback(convertToChannelState(channelResult));
    }
    // These are two distinct events from the channel client
    // but for our purposes we can treat them the same
    // and rely on the channel status
    const unsubChannelUpdated = this.channelClient.onChannelUpdated(callback);
    const unsubChannelProposed = this.channelClient.onChannelProposed(callback);

    return () => {
      unsubChannelUpdated();
      unsubChannelProposed();
    };
  }

  async joinChannel(channelId: string) {
    const channelResult = await this.channelClient.joinChannel(channelId);
    return convertToChannelState(channelResult);
  }

  async closeChannel(channelId: string): Promise<ChannelState> {
    const channelResult = await this.channelClient.closeChannel(channelId);
    return convertToChannelState(channelResult);
  }

  async challengeChannel(channelId: string): Promise<ChannelState> {
    const channelResult = await this.channelClient.challengeChannel(channelId);
    return convertToChannelState(channelResult);
  }

  async updateChannel(
    channelId: string,
    aAddress: string,
    bAddress: string,
    aBal: string,
    bBal: string,
    appAttrs: AppData,
    aOutcomeAddress: string = aAddress,
    bOutcomeAddress: string = bAddress
  ) {
    const allocations = formatAllocations(aOutcomeAddress, bOutcomeAddress, aBal, bBal);

    const appData = encodeAppData(appAttrs);

    // ignore return val for now and stub out response
    const channelResult = await this.channelClient.updateChannel(channelId, allocations, appData);

    return convertToChannelState(channelResult);
  }

  async pushMessage(message: Message) {
    await this.channelClient.pushMessage(message);
  }
}

const convertToChannelState = (channelResult: ChannelResult): ChannelState => {
  const {
    turnNum,
    channelId,
    status,
    participants,
    allocations,
    appData,
    challengeExpirationTime,
  } = channelResult;
  return {
    channelId,
    turnNum: turnNum.toString(), // TODO: turnNum should be switched to a number (or be a string everywhere),
    status,
    challengeExpirationTime,
    appData: decodeAppData(appData),
    aUserId: participants[0].participantId,
    bUserId: participants[1].participantId,
    aAddress: participants[0].destination,
    bAddress: participants[1].destination,
    aOutcomeAddress: participants[0].destination,
    bOutcomeAddress: participants[1].destination,
    aBal: bigNumberify(allocations[0].allocationItems[0].amount).toString(),
    bBal: bigNumberify(allocations[0].allocationItems[1].amount).toString(),
  };
};

const formatParticipants = (
  aAddress: string,
  bAddress: string,
  aOutcomeAddress: string = aAddress,
  bOutcomeAddress: string = bAddress
) => [
  {participantId: aAddress, signingAddress: aAddress, destination: aOutcomeAddress},
  {participantId: bAddress, signingAddress: bAddress, destination: bOutcomeAddress},
];

const formatAllocations = (aAddress: string, bAddress: string, aBal: string, bBal: string) => {
  return [
    {
      token: '0x0',
      allocationItems: [
        {destination: aAddress, amount: bigNumberify(aBal).toHexString()},
        {destination: bAddress, amount: bigNumberify(bBal).toHexString()},
      ],
    },
  ];
};
