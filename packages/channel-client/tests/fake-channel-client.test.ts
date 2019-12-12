import {FakeChannelClient, CHANNEL_ID} from '../src/fake-channel-client';
import {PARTICIPANT_A, PARTICIPANT_B, APP_DEFINITION, APP_DATA} from './constants';
import {ChannelResultBuilder, buildParticipant, buildAllocation} from './utils';
import {ChannelResult} from '../src';

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

    states[1] = ChannelResultBuilder.from(states[0])
      .setStatus('opening')
      .setTurnNum('1')
      .build();

    states[2] = ChannelResultBuilder.from(states[1])
      .setStatus('funding')
      .setTurnNum('2')
      .build();
  });

  it('instantiates', () => {
    const client = new FakeChannelClient();
    expect(client).toBeDefined();
  });

  it('creates a channel', async () => {
    const client = new FakeChannelClient();
    const channelResult = await client.createChannel(
      participants,
      allocations,
      APP_DEFINITION,
      APP_DATA
    );
    expect(states[0]).toEqual(channelResult);
  });
});
