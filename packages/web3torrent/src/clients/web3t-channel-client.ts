import {ChannelResult, Message, ChannelClientInterface} from '@statechannels/channel-client';
import {bigNumberify} from 'ethers/utils';
import {FakeChannelProvider} from '@statechannels/channel-client';
import {ChannelClient} from '@statechannels/channel-client';
import React from 'react';
import {mockChannels, mockCurrentUser} from '../constants';
export interface ChannelState {
  channelId: string;
  turnNum: string;
  challengeExpirationTime;
  seeder: string;
  leecher: string;
  seederOutcomeAddress: string;
  leecherOutcomeAddress: string;
  seederBalance: string;
  leecherBalance: string;
}

// This class wraps the channel client converting the
// request/response formats to those used in the app

if (process.env.REACT_APP_FAKE_CHANNEL_PROVIDER === 'true') {
  window.channelProvider = new FakeChannelProvider();
} else {
  // TODO: Replace with injection via other means than direct app import
  // NOTE: This adds `channelProvider` to the `Window` object
  require('@statechannels/channel-provider');
}

// TODO: Put inside better place than here where app can handle error case
window.channelProvider.enable(process.env.REACT_APP_WALLET_URL);
export interface Web3TorrentChannelClientInterface {
  createChannel(
    seeder: string,
    leecher: string,
    seederBalance: string,
    leecherBalance: string,
    seederOutcomeAddress: string,
    leecherOutcomeAddress: string
  ): Promise<ChannelState>;
  getAddress(): Promise<string>;
  getEthereumSelectedAddress(): Promise<string>;
  onMessageQueued(callback: (message: Message) => void);
  onChannelUpdated(web3tCallback: (channelState: ChannelState) => any);
  joinChannel(channelId: string);
  closeChannel(channelId: string): Promise<ChannelState>;
  challengeChannel(channelId: string): Promise<ChannelState>;
  updateChannel(
    channelId: string,
    seeder: string,
    leecher: string,
    seederBalance: string,
    leecherBalance: string,
    seederOutcomeAddress: string,
    leecherOutcomeAddress: string
  );
  acceptPayment(channelState: ChannelState);
  pushMessage(message: Message<ChannelResult>);
  approveBudgetAndFund(
    playerAmount: string,
    hubAmount: string,
    playerDestinationAddress: string,
    hubAddress: string,
    hubDestinationAddress: string
  );
}

export class Web3TorrentChannelClient implements Web3TorrentChannelClientInterface {
  mySigningAddress?: string;
  myEthereumSelectedAddress?: string; // this state can be inspected to infer whether we need to get the user to "Connect With MetaMask" or not.
  public openChannels: Array<Partial<ChannelState>> = mockChannels; // TODO change to ChannelState[];
  public myAddress: string = mockCurrentUser;
  constructor(private readonly channelClient: ChannelClientInterface) {}
  async createChannel(
    seeder: string,
    leecher: string,
    seederBalance: string,
    leecherBalance: string,
    seederOutcomeAddress: string,
    leecherOutcomeAddress: string
  ): Promise<ChannelState> {
    const participants = formatParticipants(
      leecher,
      seeder,
      leecherOutcomeAddress,
      seederOutcomeAddress
    );
    const allocations = formatAllocations(
      leecherOutcomeAddress,
      seederOutcomeAddress,
      leecherBalance,
      seederBalance
    );
    const appDefinition = '0x0'; // TODO SingleAssetPayments address

    const channelResult = await this.channelClient.createChannel(
      participants,
      allocations,
      appDefinition,
      'appData unused'
    );

    return convertToChannelState(channelResult);
  }

  async getAddress() {
    this.mySigningAddress = await this.channelClient.getAddress();
    return this.mySigningAddress;
  }

  async getEthereumSelectedAddress() {
    this.myEthereumSelectedAddress = await this.channelClient.getEthereumSelectedAddress();
    return this.myEthereumSelectedAddress;
  }

  onMessageQueued(callback: (message: Message) => void) {
    return this.channelClient.onMessageQueued(callback);
  }

  // Accepts an web3t-friendly callback, performs the necessary encoding, and subscribes to the channelClient with an appropriate, API-compliant callback
  onChannelUpdated(web3tCallback: (channelState: ChannelState) => any) {
    function callback(channelResult: ChannelResult): any {
      web3tCallback(convertToChannelState(channelResult));
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
    seeder: string,
    leecher: string,
    seederBalance: string,
    leecherBalance: string,
    seederOutcomeAddress: string,
    leecherOutcomeAddress: string
  ) {
    const allocations = formatAllocations(
      leecherOutcomeAddress,
      seederOutcomeAddress,
      leecherBalance,
      seederBalance
    );
    const participants = formatParticipants(
      leecher,
      seeder,
      leecherOutcomeAddress,
      seederOutcomeAddress
    );

    // ignore return val for now and stub out response
    const channelResult = await this.channelClient.updateChannel(
      channelId,
      participants,
      allocations,
      'appData unused'
    );

    return convertToChannelState(channelResult);
  }

  // seeder may use this method to accept payments
  async acceptPayment(channelState: ChannelState) {
    const {
      channelId,
      seeder,
      leecher,
      seederBalance,
      leecherBalance,
      seederOutcomeAddress,
      leecherOutcomeAddress
    } = channelState;
    this.updateChannel(
      channelId,
      seeder,
      leecher,
      seederBalance,
      leecherBalance,
      seederOutcomeAddress,
      leecherOutcomeAddress
    );
  }

  async pushMessage(message: Message<ChannelResult>) {
    await this.channelClient.pushMessage(message);
  }

  async approveBudgetAndFund(
    playerAmount: string,
    hubAmount: string,
    playerDestinationAddress: string,
    hubAddress: string,
    hubDestinationAddress: string
  ) {
    await this.channelClient.approveBudgetAndFund(
      playerAmount,
      hubAmount,
      playerDestinationAddress,
      hubAddress,
      hubDestinationAddress
    );
  }
}

export const web3TorrentChannelClient = new Web3TorrentChannelClient(
  new ChannelClient(window.channelProvider)
);

export const ChannelContext = React.createContext(web3TorrentChannelClient);

const convertToChannelState = (channelResult: ChannelResult): ChannelState => {
  const {turnNum, channelId, participants, allocations, challengeExpirationTime} = channelResult;
  return {
    channelId,
    turnNum: turnNum.toString(), // TODO: turnNum should be switched to a number (or be a string everywhere),
    challengeExpirationTime,
    leecher: participants[0].participantId,
    seeder: participants[1].participantId,
    leecherOutcomeAddress: participants[0].destination,
    seederOutcomeAddress: participants[1].destination,
    leecherBalance: bigNumberify(allocations[0].allocationItems[0].amount).toString(),
    seederBalance: bigNumberify(allocations[0].allocationItems[1].amount).toString()
  };
};

const formatParticipants = (
  aAddress: string,
  bAddress: string,
  aOutcomeAddress: string = aAddress,
  bOutcomeAddress: string = bAddress
) => [
  {participantId: aAddress, signingAddress: aAddress, destination: aOutcomeAddress},
  {participantId: bAddress, signingAddress: bAddress, destination: bOutcomeAddress}
];

const formatAllocations = (aAddress: string, bAddress: string, aBal: string, bBal: string) => {
  return [
    {
      token: '0x0',
      allocationItems: [
        {destination: aAddress, amount: bigNumberify(aBal).toHexString()},
        {destination: bAddress, amount: bigNumberify(bBal).toHexString()}
      ]
    }
  ];
};
