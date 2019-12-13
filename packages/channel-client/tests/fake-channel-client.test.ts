import {FakeChannelClient, CHANNEL_ID} from '../src/fake-channel-client';
import {PARTICIPANT_A, PARTICIPANT_B, APP_DEFINITION, APP_DATA} from './constants';
import {ChannelResultBuilder, buildParticipant, buildAllocation, setClientStates} from './utils';
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

  let clientA: FakeChannelClient, clientB: FakeChannelClient;

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

    states[3] = ChannelResultBuilder.from(states[1])
      .setStatus('running')
      .setTurnNum('3')
      .build();
  });

  beforeEach(() => {
    clientA = new FakeChannelClient();
    clientB = new FakeChannelClient();
  });

  it('instantiates', () => {
    expect(clientA).toBeDefined();
    expect(clientB).toBeDefined();
  });

  it('creates a channel', async () => {
    const channelResult = await clientA.createChannel(
      participants,
      allocations,
      APP_DEFINITION,
      APP_DATA
    );
    expect(states[0]).toEqual(channelResult);
  });

  it('joins a channel', async () => {
    setClientStates([clientA, clientB], states[0]);
    const channelResult = await clientB.joinChannel(CHANNEL_ID);
    expect(states[3]).toEqual(channelResult);
  });
});
