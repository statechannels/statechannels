import {encodeConsensusData, State} from '@statechannels/nitro-protocol';
import {HUB_ADDRESS} from '../../../constants';
import {
  DUMMY_CHAIN_ID,
  DUMMY_RULES_ADDRESS,
  DUMMY_RULES_FUNDED_NONCE_CHANNEL_ID,
  FUNDED_CHANNEL_NONCE,
  outcome2,
  PARTICIPANT_1_ADDRESS
} from '../../../test/test-constants';
import {consensus_app_data2} from '../../../test/test_data';
import Channel from '../channel';
import ChannelState from '../channelState';

describe('asStateObject', () => {
  it('channelState relation to object conversion', async () => {
    const channel = await Channel.query()
      .where({channel_id: DUMMY_RULES_FUNDED_NONCE_CHANNEL_ID})
      .select('id')
      .first();
    expect(channel).toBeTruthy();
    const channelState: ChannelState = await ChannelState.query()
      .where({
        channel_id: channel.id,
        turn_num: 0
      })
      .eager('[channel.[participants], outcome.[allocation]]')
      .select()
      .first();

    const expectedState: State = {
      turnNum: 0,
      isFinal: false,
      channel: {
        channelNonce: FUNDED_CHANNEL_NONCE,
        participants: [PARTICIPANT_1_ADDRESS, HUB_ADDRESS],
        chainId: DUMMY_CHAIN_ID
      },
      challengeDuration: 1000,
      outcome: outcome2,
      appDefinition: DUMMY_RULES_ADDRESS,
      appData: encodeConsensusData(consensus_app_data2(2))
    };
    const state: State = channelState.asStateObject();
    expect(state).toMatchObject(expectedState);
  });
});
