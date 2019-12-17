import {RPSChannelClient} from '../rps-channel-client';
import {aAddress, bAddress, aBal, bBal, appData} from '../../redux/game/__tests__/scenarios';
import {
  ChannelClientInterface,
  ChannelResult,
  PushMessageResult,
} from '@statechannels/channel-client';
import {encodeAppData, ChannelState} from '../../core';
import {bigNumberify} from 'ethers/utils';
import {RPS_ADDRESS} from '../../constants';

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
const mockChannelState: ChannelState = {
  channelId: MOCK_CHANNEL_ID,
  turnNum: '0',
  status: 'opening',
  aUserId: aAddress,
  bUserId: bAddress,
  aAddress: aAddress,
  bAddress: bAddress,
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
  turnNum: '0',
};

class MockChannelClient implements ChannelClientInterface {
  onMessageQueued = jest.fn(function(callback) {
    return onMessageQueuedMockReturn;
  });
  onChannelUpdated = jest.fn(function(callback) {
    return onChannelUpdatedMockReturn;
  });
  onChannelProposed = jest.fn(function(callback) {
    return onChannelProposedmMockReturn;
  });
  createChannel = jest.fn(async function(participants, allocations, appDefinition, appData) {
    const channelResult: ChannelResult = {
      participants,
      allocations,
      appData,
      appDefinition,
      channelId: MOCK_CHANNEL_ID,
      status: 'opening',
      turnNum: '0',
    };
    return await channelResult;
  });
  joinChannel = jest.fn(async function(channelId: string) {
    return await mockChannelResult;
  });
  updateChannel(channelId: string, participants, allocations, appData: string) {
    return new Promise<ChannelResult>(() => {
      /* */
    });
  }
  closeChannel(channelId: string) {
    return new Promise<ChannelResult>(() => {
      /* */
    });
  }
  pushMessage(message) {
    return new Promise<PushMessageResult>(() => {
      /* */
    });
  }
  getAddress = jest.fn(async function() {
    return await MOCK_ADDRESS;
  });
}

let mockChannelClient;
let client;

beforeAll(() => {
  mockChannelClient = new MockChannelClient();
  client = new RPSChannelClient(mockChannelClient);
});

describe('when getAddress() is called', () => {
  let result;
  beforeAll(async () => {
    result = await client.getAddress();
  });
  it('calls channelClient.getAddress()', async () => {
    expect(mockChannelClient.getAddress).toHaveBeenCalled();
  });
  it('and returns the result', async () => {
    expect(result).toEqual(MOCK_ADDRESS);
  });
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
