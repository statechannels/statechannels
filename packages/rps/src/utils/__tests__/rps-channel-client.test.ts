import {RPSChannelClient} from '../rps-channel-client';
import {aAddress, bAddress, aBal, bBal, appData} from '../../redux/game/__tests__/scenarios';

// TODO: Get this working with a mock for channel-client
it.skip('works', async () => {
  const client = new RPSChannelClient();

  const spy = jest.fn();

  client.onMessageQueued(spy);

  const state = await client.createChannel(aAddress, bAddress, aBal, bBal, appData.start);

  expect(state).toMatchObject({aAddress, bAddress, aBal, bBal, appData: appData.start});
  expect(spy).toHaveBeenCalledTimes(1);
});
