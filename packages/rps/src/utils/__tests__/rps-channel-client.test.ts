import {RPSChannelClient} from '../rps-channel-client';
import {aAddress, bAddress, aBal, bBal, appData} from '../../redux/game/__tests__/scenarios';
import {ChannelProviderInterface} from '@statechannels/channel-provider';
import EventEmitter = require('eventemitter3');

class MockChannelProvider implements ChannelProviderInterface {
  protected readonly events: EventEmitter;
  constructor() {
    this.events = new EventEmitter();
  }

  enable(url?: string) {
    return new Promise<void>(() => {
      /*empty*/
    });
  }
  send = jest.fn().mockImplementationOnce(async (method: string, params: any) => {
    const response = await params;
    this.events.emit('MessageQueued', '');
    return response;
  });
  on(event: string, callback) {
    this.events.on(event, callback);
  }
  off(event: string, callback) {
    this.events.off(event, callback);
  }
  subscribe(subscriptionType: string, params?: any) {
    return new Promise<string>(() => {
      /*empty*/
    });
  }
  unsubscribe(subscriptionId: string) {
    return new Promise<boolean>(() => {
      /*empty*/
    });
  }
}

it('works', async () => {
  const client = new RPSChannelClient(new MockChannelProvider());

  const spy = jest.fn();

  client.onMessageQueued(spy);

  const state = await client.createChannel(aAddress, bAddress, aBal, bBal, appData.start);

  expect(state).toMatchObject({aAddress, bAddress, aBal, bBal, appData: appData.start});
  expect(spy).toHaveBeenCalledTimes(1);
});
