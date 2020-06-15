import {RPSChannelClient} from '../rps-channel-client';
import {aAddress, bAddress, aBal, bBal, appData} from '../../redux/game/__tests__/scenarios';
import {
  ChannelClientInterface,
  ChannelResult,
  FakeChannelProvider,
} from '@statechannels/channel-client';
import {encodeAppData, ChannelState} from '../../core';
import {bigNumberify} from 'ethers/utils';
import {RPS_ADDRESS} from '../../constants';
import {DomainBudget} from '@statechannels/client-api-schema';
import {ReplaySubject} from 'rxjs';
const MOCK_ADDRESS = '0xAddress';
const MOCK_CHANNEL_ID = '0xChannelId';
const participants = [
  {participantId: aAddress, signingAddress: aAddress, destination: aAddress},
  {participantId: bAddress, signingAddress: bAddress, destination: bAddress},
];
const allocations = [
  {
    token: '0x0',
    allocationItems: [
      {destination: aAddress, amount: bigNumberify(aBal).toHexString()},
      {destination: bAddress, amount: bigNumberify(bBal).toHexString()},
    ],
  },
];
const appDefinition = RPS_ADDRESS;
const onMessageQueuedMockReturn = () => '0xOMQReturn';
const onChannelUpdatedMockReturn = jest.fn(() => '0xOCUReturn');
const onChannelProposedmMockReturn = jest.fn(() => '0xOCPReturn');
const onBudgetUpdatedMockReturn = jest.fn(() => '0xOCRReturn');
const mockChannelState: ChannelState = {
  channelId: MOCK_CHANNEL_ID,
  turnNum: '0',
  status: 'opening',
  aUserId: aAddress,
  bUserId: bAddress,
  aAddress: aAddress,
  bAddress: bAddress,
  aOutcomeAddress: aAddress,
  bOutcomeAddress: bAddress,
  aBal: aBal,
  bBal: bBal,
  appData: appData.start,
};
const mockChannelResult: ChannelResult = {
  participants,
  allocations,
  appData: encodeAppData(appData.start),
  appDefinition,
  channelId: MOCK_CHANNEL_ID,
  status: 'opening',
  turnNum: bigNumberify(0).toString(),
};
// ^ In the wild there will be different ChannelResults t: e.g. the status will not always be 'opening'. But we are only testing that the RPSChannelClient is wrapping the ChannelClient correctly. Getting the right data back is partly (mostly) the responsibility of the inner class instance. Therefore in this test we can reuse the same object, since it only needs to be the right type in order to be encoded and decoded properly.

class MockChannelClient implements ChannelClientInterface {
  onMessageQueued = jest.fn(function(callback) {
    return onMessageQueuedMockReturn;
  });
  channelState = new ReplaySubject<ChannelResult>(1);
  onChannelUpdated = jest.fn(function(callback) {
    return onChannelUpdatedMockReturn;
  });
  onChannelProposed = jest.fn(function(callback) {
    return onChannelProposedmMockReturn;
  });
  onBudgetUpdated = jest.fn(function(callback) {
    return onBudgetUpdatedMockReturn;
  });
  createChannel = jest.fn(async function(participants, allocations, appDefinition, appData) {
    const channelResult: ChannelResult = {
      ...mockChannelResult,
      participants,
      allocations,
      appData,
      appDefinition,
    };
    return await channelResult;
  });
  joinChannel = jest.fn(async function(channelId: string) {
    return await mockChannelResult;
  });
  getState = jest.fn(async function(channelId: string) {
    return await mockChannelResult;
  });
  updateChannel = jest.fn(async function(channelId, participants, allocations, appData) {
    return await mockChannelResult;
  });
  closeChannel = jest.fn(async function(channelId: string) {
    return await mockChannelResult;
  });
  challengeChannel = jest.fn(async function(channelId: string) {
    return await mockChannelResult;
  });
  getChannels = jest.fn();
  pushMessage(message) {
    return new Promise<any>(() => {
      /* */
    });
  }

  provider = new FakeChannelProvider();
  walletVersion = 'JestMockVersion';
  signingAddress = MOCK_ADDRESS;
  destinationAddress = MOCK_ADDRESS;

  approveBudgetAndFund = jest.fn(async function(
    playerAmount: string,
    hubAmount: string,
    hubAddress: string,
    hubOutcomeAddress: string
  ): Promise<DomainBudget> {
    return new Promise<DomainBudget>(() => {
      /* */
    });
  });

  getBudget = jest.fn(async function(hubAddress: string) {
    return new Promise<DomainBudget>(() => {
      /* */
    });
  });

  closeAndWithdraw = jest.fn(async function(hubAddress: string) {
    return new Promise<DomainBudget>(() => {
      /* */
    });
  });
}

let mockChannelClient;
let client;

beforeAll(() => {
  mockChannelClient = new MockChannelClient();
  client = new RPSChannelClient(mockChannelClient);
});

describe('when createChannel() is called', () => {
  let result;
  beforeAll(async () => {
    result = await client.createChannel(aAddress, bAddress, aBal, bBal, appData.start);
  });
  it('calls channelClient.createChannel() with appropriately encoded data', async () => {
    expect(mockChannelClient.createChannel).toHaveBeenCalledWith(
      participants,
      allocations,
      appDefinition,
      encodeAppData(appData.start),
      'Direct'
    );
  });
  it('decodes and returns the result', async () => {
    const channelState: ChannelState = {
      channelId: MOCK_CHANNEL_ID,
      turnNum: '0',
      status: 'opening',
      aUserId: aAddress,
      bUserId: bAddress,
      aAddress: aAddress,
      bAddress: bAddress,
      aOutcomeAddress: aAddress,
      bOutcomeAddress: bAddress,
      aBal: aBal,
      bBal: bBal,
      appData: appData.start,
    };
    expect(result).toEqual(channelState);
  });
});

describe('when updateChannel() is called', () => {
  let result;
  beforeAll(async () => {
    result = await client.updateChannel(
      MOCK_CHANNEL_ID,
      aAddress,
      bAddress,
      aBal,
      bBal,
      appData.start
    );
  });
  it('calls channelClient.updateChannel() with appropriately encoded data', async () => {
    expect(mockChannelClient.updateChannel).toHaveBeenCalledWith(
      MOCK_CHANNEL_ID,
      participants,
      allocations,
      encodeAppData(appData.start)
    );
  });
  it('decodes and returns the result', async () => {
    const channelState: ChannelState = {
      channelId: MOCK_CHANNEL_ID,
      turnNum: '0',
      status: 'opening',
      aUserId: aAddress,
      bUserId: bAddress,
      aAddress: aAddress,
      bAddress: bAddress,
      aOutcomeAddress: aAddress,
      bOutcomeAddress: bAddress,
      aBal: aBal,
      bBal: bBal,
      appData: appData.start,
    };
    expect(result).toEqual(channelState);
  });
});

describe('when joinChannel() is called', () => {
  let result;
  beforeAll(async () => {
    result = await client.joinChannel(MOCK_CHANNEL_ID);
  });
  it('calls channelClient.joinChannel() with the same channelId', async () => {
    expect(mockChannelClient.joinChannel).toHaveBeenCalledWith(MOCK_CHANNEL_ID);
  });
  it('decodes and returns the result', async () => {
    expect(result).toEqual(mockChannelState);
  });
});

describe('when closeChannel() is called', () => {
  let result;
  beforeAll(async () => {
    result = await client.closeChannel(MOCK_CHANNEL_ID);
  });
  it('calls channelClient.joinChannel() with the same channelId', async () => {
    expect(mockChannelClient.closeChannel).toHaveBeenCalledWith(MOCK_CHANNEL_ID);
  });
  it('decodes and returns the result', async () => {
    expect(result).toEqual(mockChannelState);
  });
});

describe('when challengeChannel() is called', () => {
  let result;
  beforeAll(async () => {
    result = await client.challengeChannel(MOCK_CHANNEL_ID);
  });
  it('decodes and returns the result', async () => {
    expect(result).toEqual(mockChannelState);
  });
});

describe('when onMessageQueued is called with a callback', () => {
  let result;
  const callback = jest.fn();
  beforeAll(async () => {
    result = await client.onMessageQueued(callback);
  });
  it('calls channelClient.onMessageQueued() with the same callback', async () => {
    expect(mockChannelClient.onMessageQueued).toHaveBeenCalledWith(callback);
  });
  it('and returns the result', async () => {
    expect(result).toEqual(onMessageQueuedMockReturn);
  });
});

describe('when onChannelUpdated is called with an rps callback', () => {
  let result: Function;
  const rpsCallback = jest.fn();
  beforeAll(async () => {
    result = await client.onChannelUpdated(rpsCallback);
  });
  it('calls channelClient.onChannelUpdated() AND channelClient.onChannelProposed with a wrapper callback', async () => {
    // TODO: somehow check the argument is a wrapper callback
    expect(mockChannelClient.onChannelUpdated).toHaveBeenCalled();
    expect(mockChannelClient.onChannelProposed).toHaveBeenCalled();
  });
  it('and returns a function that runs both returned (unsubscribe) functions', async () => {
    result();
    expect(onChannelUpdatedMockReturn).toHaveBeenCalled();
    expect(onChannelProposedmMockReturn).toHaveBeenCalled();
  });
});
