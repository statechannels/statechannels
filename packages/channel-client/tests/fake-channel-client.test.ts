import {FakeChannelClient, CHANNEL_ID} from '../src/fake-channel-client';
import {ChannelResult} from '../lib/src';
import {ChannelResultBuilder, buildParticipant, buildAllocation} from './utils';
import {PARTICIPANT_A, PARTICIPANT_B, APP_DEFINITION, APP_DATA} from './constants';

interface StateMap {
  [stateNumber: number]: ChannelResult;
}

describe('FakeChannelClient', () => {
  const participantA = buildParticipant(PARTICIPANT_A);
  const participantB = buildParticipant(PARTICIPANT_B);

  const states: StateMap = {};
  const participants = [participantA, participantB];
  const allocations = [buildAllocation(PARTICIPANT_A, '5'), buildAllocation(PARTICIPANT_B, '5')];

  beforeAll(() => {
    states[0] = new ChannelResultBuilder(
      participants,
      allocations,
      APP_DEFINITION,
      APP_DATA,
      CHANNEL_ID,
      '0',
      'proposed'
    ).build();

    states[1] = ChannelResultBuilder.setStatus(states[0], 'opening');
    states[2] = ChannelResultBuilder.setStatus(states[1], 'funding');
  });

  it('instantiates', () => {
    const client = new FakeChannelClient();
    expect(client).toBeDefined();
  });
});
