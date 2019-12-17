import {RPSChannelClient} from '../rps-channel-client';
import {aAddress, bAddress, aBal, bBal, appData} from '../../redux/game/__tests__/scenarios';
import {
  ChannelClientInterface,
  ChannelResult,
  PushMessageResult,
} from '@statechannels/channel-client';
import {encodeAppData} from '../../core';
import {bigNumberify} from 'ethers/utils';
import {RPS_ADDRESS} from '../../constants';

class MockChannelClient implements ChannelClientInterface {
  onMessageQueued = jest.fn(function(callback) {
    return () => {
      /* */
    };
  });
  onChannelUpdated(callback) {
    return () => {
      /* */
    };
  }
  onChannelProposed(callback) {
    return () => {
      /* */
    };
  }
  createChannel = jest.fn(async function(participants, allocations, appDefinition, appData) {
    const channelResult: ChannelResult = {
      participants,
      allocations,
      appData,
      appDefinition,
      channelId: '0x123',
      status: 'opening',
      turnNum: '0',
    };
    return await channelResult;
  });
  joinChannel(channelId: string) {
    return new Promise<ChannelResult>(() => {
      /* */
    });
  }
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
  getAddress() {
    return new Promise<string>(() => {
      /* */
    });
  }
}

it('calls channelClient.createChannel with appropriately encoded date', async () => {
  const mockChannelClient = new MockChannelClient();
  const client = new RPSChannelClient(mockChannelClient);

  await client.createChannel(aAddress, bAddress, aBal, bBal, appData.start);

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

  expect(mockChannelClient.createChannel).toHaveBeenCalledWith(
    participants,
    allocations,
    appDefinition,
    encodeAppData(appData.start)
  );
});
