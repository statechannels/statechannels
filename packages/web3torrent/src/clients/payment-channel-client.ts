import {ChannelResult, Message, ChannelClientInterface} from '@statechannels/channel-client';
import {bigNumberify} from 'ethers/utils';
import {FakeChannelProvider} from '@statechannels/channel-client';
import {ChannelClient} from '@statechannels/channel-client';
import React from 'react';
import {ChannelStatus} from '@statechannels/client-api-schema';

export interface ChannelState {
  channelId: string;
  turnNum: string;
  status: ChannelStatus;
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
export interface PaymentChannelClientInterface {
  mySigningAddress?: string;
  myEthereumSelectedAddress?: string; // this state can be inspected to infer whether we need to get the user to "Connect With MetaMask" or not.
  channelCache: Record<string, ChannelState>;
  myAddress: string;
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
  onChannelProposed(web3tCallback: (channelState: ChannelState) => any);
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
  makePayment(channelId: string, amount: string);
  acceptPayment(channelState: ChannelState);
  isPaymentToMe(channelState: ChannelState): boolean;
  pushMessage(message: Message<ChannelResult>);
  approveBudgetAndFund(
    playerAmount: string,
    hubAmount: string,
    playerDestinationAddress: string,
    hubAddress: string,
    hubDestinationAddress: string
  );
}

export class PaymentChannelClient implements PaymentChannelClientInterface {
  mySigningAddress?: string;
  myEthereumSelectedAddress?: string; // this state can be inspected to infer whether we need to get the user to "Connect With MetaMask" or not.
  channelCache: Record<string, ChannelState> = {};
  myAddress: string;
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
      seeder,
      leecher,
      seederOutcomeAddress,
      leecherOutcomeAddress
    );
    const allocations = formatAllocations(
      seederOutcomeAddress,
      leecherOutcomeAddress,
      seederBalance,
      leecherBalance
    );
    const appDefinition = '0x0'; // TODO SingleAssetPayments address

    const channelResult = await this.channelClient.createChannel(
      participants,
      allocations,
      appDefinition,
      'appData unused'
    );
    this.cacheChannelState(convertToChannelState(channelResult));
    return convertToChannelState(channelResult);
  }

  async getAddress() {
    this.mySigningAddress = await this.channelClient.getAddress();
    return this.mySigningAddress;
  }

  async getEthereumSelectedAddress() {
    this.myEthereumSelectedAddress = window.ethereum.selectedAddress;
    // this.myEthereumSelectedAddress = await this.channelClient.getEthereumSelectedAddress();
    return this.myEthereumSelectedAddress;
  }

  onMessageQueued(callback: (message: Message) => void) {
    return this.channelClient.onMessageQueued(callback);
  }

  cacheChannelState(channelState: ChannelState) {
    this.channelCache = {...this.channelCache, [channelState.channelId]: channelState};
  }

  // Accepts an web3t-friendly callback, performs the necessary encoding, and subscribes to the channelClient with an appropriate, API-compliant callback
  onChannelUpdated(web3tCallback: (channelState: ChannelState) => any) {
    function callback(channelResult: ChannelResult): any {
      web3tCallback(convertToChannelState(channelResult));
    }
    const unsubChannelUpdated = this.channelClient.onChannelUpdated(callback);
    return () => {
      unsubChannelUpdated();
    };
  }

  onChannelProposed(web3tCallback: (channelState: ChannelState) => any) {
    function callback(channelResult: ChannelResult): any {
      web3tCallback(convertToChannelState(channelResult));
    }
    const unsubChannelProposed = this.channelClient.onChannelProposed(callback);
    return () => {
      unsubChannelProposed();
    };
  }

  async joinChannel(channelId: string) {
    const channelResult = await this.channelClient.joinChannel(channelId);
    this.cacheChannelState(convertToChannelState(channelResult));
    return convertToChannelState(channelResult);
  }

  async closeChannel(channelId: string): Promise<ChannelState> {
    const channelResult = await this.channelClient.closeChannel(channelId);
    this.cacheChannelState(convertToChannelState(channelResult));
    return convertToChannelState(channelResult);
  }

  async challengeChannel(channelId: string): Promise<ChannelState> {
    const channelResult = await this.channelClient.challengeChannel(channelId);
    this.cacheChannelState(convertToChannelState(channelResult));
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
      seederOutcomeAddress,
      leecherOutcomeAddress,
      seederBalance,
      leecherBalance
    );
    const participants = formatParticipants(
      seeder,
      leecher,
      seederOutcomeAddress,
      leecherOutcomeAddress
    );

    // ignore return val for now and stub out response
    const channelResult = await this.channelClient.updateChannel(
      channelId,
      participants,
      allocations,
      'appData unused'
    );
    this.cacheChannelState(convertToChannelState(channelResult));
    return convertToChannelState(channelResult);
  }

  // leecher may use this method to make payments (if they have sufficient funds)
  async makePayment(channelId: string, amount: string) {
    const {
      seeder,
      leecher,
      seederBalance,
      leecherBalance,
      seederOutcomeAddress,
      leecherOutcomeAddress
    } = this.channelCache[channelId];
    if (bigNumberify(leecherBalance).gte(amount)) {
      await this.updateChannel(
        channelId, // channelId,
        seeder, // seeder,
        leecher, // leecher,
        bigNumberify(seederBalance)
          .add(amount)
          .toString(), // seederBalance,
        bigNumberify(leecherBalance)
          .sub(amount)
          .toString(), // leecherBalance,
        seederOutcomeAddress, // seederOutcomeAddress,
        leecherOutcomeAddress // leecherOutcomeAddress
      );
    }
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
    await this.updateChannel(
      channelId,
      seeder,
      leecher,
      seederBalance,
      leecherBalance,
      seederOutcomeAddress,
      leecherOutcomeAddress
    );
  }

  isPaymentToMe(channelState: ChannelState): boolean {
    // doesn't guarantee that my balance increased
    const myIndex = channelState.seeder ? 0 : 1;
    return channelState.status === 'running' && Number(channelState.turnNum) % 2 === myIndex;
  }

  async pushMessage(message: Message<ChannelResult>) {
    await this.channelClient.pushMessage(message);
    const channelResult: ChannelResult = message.data;
    this.cacheChannelState(convertToChannelState(channelResult));
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

export const paymentChannelClient = new PaymentChannelClient(
  new ChannelClient(window.channelProvider)
);

export const ChannelContext = React.createContext(paymentChannelClient);

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
    turnNum: turnNum.toString(), // TODO: turnNum should be switched to a number (or be a string everywhere),
    status,
    challengeExpirationTime,
    seeder: participants[0].participantId,
    leecher: participants[1].participantId,
    seederOutcomeAddress: participants[0].destination,
    leecherOutcomeAddress: participants[1].destination,
    seederBalance: bigNumberify(allocations[0].allocationItems[0].amount).toString(),
    leecherBalance: bigNumberify(allocations[0].allocationItems[1].amount).toString()
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

// Mocks

export class MockPaymentChannelClient implements PaymentChannelClientInterface {
  mySigningAddress?: string;
  myEthereumSelectedAddress?: string; // this state can be inspected to infer whether we need to get the user to "Connect With MetaMask" or not.
  channelCache: Record<string, ChannelState> = {};
  myAddress: string;
  constructor(private readonly channelClient: ChannelClientInterface) {}

  mockChannelState: ChannelState = {
    channelId: '0x0',
    turnNum: '0x0',
    status: 'running',
    challengeExpirationTime: '0x0',
    seeder: '0x0',
    leecher: '0x0',
    seederOutcomeAddress: '0x0',
    leecherOutcomeAddress: '0x0',
    seederBalance: '0x0',
    leecherBalance: '0x0'
  };
  async createChannel(
    seeder: string,
    leecher: string,
    seederBalance: string,
    leecherBalance: string,
    seederOutcomeAddress: string,
    leecherOutcomeAddress: string
  ): Promise<ChannelState> {
    return this.mockChannelState;
  }
  async getAddress() {
    return '0x0';
  }
  async getEthereumSelectedAddress() {
    return '0x0';
  }
  onMessageQueued(callback: (message: Message) => void) {
    return () => {};
  }
  // Accepts an web3t-friendly callback, performs the necessary encoding, and subscribes to the channelClient with an appropriate, API-compliant callback
  onChannelUpdated(web3tCallback: (channelState: ChannelState) => any) {
    return () => {};
  }
  onChannelProposed(web3tCallback: (channelState: ChannelState) => any) {
    return () => {};
  }
  async joinChannel(channelId: string) {
    return {};
  }
  async closeChannel(channelId: string): Promise<ChannelState> {
    return this.mockChannelState;
  }
  async challengeChannel(channelId: string): Promise<ChannelState> {
    return this.mockChannelState;
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
    return {};
  }
  async makePayment(channelId: string, amount: string) {}
  async acceptPayment(channelState: ChannelState) {}
  isPaymentToMe(channelState: ChannelState): boolean {
    return false;
  }
  async pushMessage(message: Message<ChannelResult>) {}
  async approveBudgetAndFund(
    playerAmount: string,
    hubAmount: string,
    playerDestinationAddress: string,
    hubAddress: string,
    hubDestinationAddress: string
  ) {}
}
