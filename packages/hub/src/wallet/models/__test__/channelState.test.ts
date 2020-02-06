import {encodeConsensusData, State} from '@statechannels/nitro-protocol';
import {
  allocationOutcome2,
  DUMMY_RULES_ADDRESS,
  guaranteeOutcome2
} from '../../../test/test-constants';
import {
  consensusAppData2,
  FUNDED_CHANNEL_ID,
  FUNDED_GUARANTOR_CHANNEL_ID,
  fundedChannel,
  fundedGuarantorChannel
} from '../../../test/test-data';
import Channel from '../channel';
import ChannelState from '../channelState';

async function getChannelStates(channelId): Promise<State> {
  const channel = await Channel.query()
    .findOne({channel_id: channelId})
    .select('id');
  expect(channel).toBeTruthy();
  const channelState: ChannelState = await ChannelState.query()
    .findOne({
      channel_id: channel.id,
      turn_num: 0
    })
    .eager('[channel.[participants], outcome.[allocationItems]]')
    .select();
  return channelState.asStateObject();
}

describe('asStateObject', () => {
  it('allocation channelState relation to object conversion', async () => {
    const state = await getChannelStates(FUNDED_CHANNEL_ID);

    const expectedState: State = {
      turnNum: 0,
      isFinal: false,
      channel: fundedChannel,
      challengeDuration: 1000,
      outcome: allocationOutcome2,
      appDefinition: DUMMY_RULES_ADDRESS,
      appData: encodeConsensusData(consensusAppData2(2))
    };

    expect(state).toMatchObject(expectedState);
  });

  it('guarantor channelState relation to object conversion', async () => {
    const state = await getChannelStates(FUNDED_GUARANTOR_CHANNEL_ID);

    const expectedState: State = {
      turnNum: 0,
      isFinal: false,
      channel: fundedGuarantorChannel,
      challengeDuration: 1000,
      outcome: guaranteeOutcome2,
      appDefinition: DUMMY_RULES_ADDRESS,
      appData: encodeConsensusData(consensusAppData2(2))
    };

    expect(state).toMatchObject(expectedState);
  });
});
