import { RPSChannelClient } from '../rps-channel-client';
import { aAddress, bAddress, aBal, bBal, appData } from '../../redux/game/__tests__/scenarios';

describe('as player A', () => {
  it('works', async () => {
    // as the client stores state, it's easiest to have a massive test that goes through
    // the whole flow

    const client = new RPSChannelClient();

    // createChannel
    const spy = jest.fn();
    client.onMessageQueued(spy);

    const state = await client.createChannel(aAddress, bAddress, aBal, bBal, appData.start);

    expect(state).toMatchObject({ aAddress, bAddress, aBal, bBal, appData: appData.start });
    expect(spy).toHaveBeenCalledTimes(1);

    // pushMessage
  });
});
