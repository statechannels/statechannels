import {FakeChannelClient} from '../src/fake-channel-client';
import {
  PARTICIPANT_A,
  PARTICIPANT_B,
  APP_DEFINITION,
  APP_DATA,
  UPDATED_APP_DATA
} from './constants';
import {ChannelResultBuilder, buildParticipant, buildAllocation, setClientStates} from './utils';
import {ChannelResult} from '../src';
import {calculateChannelId} from '../src/utils';

interface StateMap {
  [stateNumber: number]: ChannelResult;
}

describe('FakeChannelClient', () => {
  const participantA = buildParticipant(PARTICIPANT_A);
  const participantB = buildParticipant(PARTICIPANT_B);

  const states: StateMap = {};
  const participants = [participantA, participantB];
  const allocations = [buildAllocation(PARTICIPANT_A, '5'), buildAllocation(PARTICIPANT_B, '5')];
  const channelId = calculateChannelId(participants, allocations, APP_DEFINITION, APP_DATA);

  let clientA: FakeChannelClient, clientB: FakeChannelClient;

  beforeAll(() => {
    states[0] = new ChannelResultBuilder(
      participants,
      allocations,
      APP_DEFINITION,
      APP_DATA,
      channelId,
      '0',
      'proposed'
    ).build();

    states[1] = ChannelResultBuilder.from(states[0])
      .setStatus('running')
      .setTurnNum('3')
      .build();

    states[2] = ChannelResultBuilder.from(states[1])
      .setAppData(UPDATED_APP_DATA)
      .setTurnNum('4')
      .build();
  });

  beforeEach(() => {
    clientA = new FakeChannelClient(participantA.participantId);
    clientB = new FakeChannelClient(participantB.participantId);

    clientA.playerIndex = 0;
    clientA.opponentAddress = participantB.participantId;

    clientB.playerIndex = 1;
    clientB.opponentAddress = participantA.participantId;
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
    const channelResult = await clientB.joinChannel(channelId);
    expect(states[1]).toEqual(channelResult);
  });

  it('updates a channel', async () => {
    setClientStates([clientA, clientB], states[1]);
    const channelResult = await clientA.updateChannel(
      channelId,
      participants,
      allocations,
      UPDATED_APP_DATA
    );
    expect(channelResult).toEqual(states[2]);
  });
});
