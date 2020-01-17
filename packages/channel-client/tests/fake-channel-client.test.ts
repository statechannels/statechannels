import log = require('loglevel');
import EventEmitter = require('eventemitter3');

import {
  PARTICIPANT_A,
  PARTICIPANT_B,
  APP_DEFINITION,
  APP_DATA,
  UPDATED_APP_DATA
} from './constants';
import {ChannelResultBuilder, buildParticipant, buildAllocation, setClientStates} from './utils';
import {ChannelResult, Message} from '../src';
import {EventsWithArgs} from '../src/types';
import {calculateChannelId} from '../src/utils';
import {FakeChannelClient} from './fakes/fake-channel-client';

log.setDefaultLevel(log.levels.SILENT);

interface StateMap {
  [channelStatus: string]: ChannelResult;
}

describe('FakeChannelClient', () => {
  const participantA = buildParticipant(PARTICIPANT_A);
  const participantB = buildParticipant(PARTICIPANT_B);

  const states: StateMap = {};
  const participants = [participantA, participantB];
  const allocations = [buildAllocation(PARTICIPANT_A, '5'), buildAllocation(PARTICIPANT_B, '5')];
  const channelId = calculateChannelId(participants, APP_DEFINITION);

  // This event emitter only enable easier assertions of expected
  // events the client is listening on
  const clientBEventEmitter = new EventEmitter<EventsWithArgs>();

  let clientA: FakeChannelClient, clientB: FakeChannelClient;

  beforeAll(() => {
    states['proposed'] = new ChannelResultBuilder(
      participants,
      allocations,
      APP_DEFINITION,
      APP_DATA,
      channelId,
      '0',
      'proposed'
    ).build();

    states['running'] = ChannelResultBuilder.from(states['proposed'])
      .setStatus('running')
      .setTurnNum('3')
      .build();

    states['updated_app_data'] = ChannelResultBuilder.from(states['running'])
      .setAppData(UPDATED_APP_DATA)
      .setTurnNum('4')
      .build();

    states['closed'] = ChannelResultBuilder.from(states['running'])
      .setStatus('closed')
      .setTurnNum('5')
      .build();
  });

  beforeEach(() => {
    clientA = new FakeChannelClient(participantA.participantId);
    clientB = new FakeChannelClient(participantB.participantId);

    clientA.updatePlayerIndex(0);
    clientA.opponentAddress = participantB.participantId;

    clientB.updatePlayerIndex(1);
    clientB.opponentAddress = participantA.participantId;

    // This setup simulates the message being received from A's wallet
    // and "queued" by A's app to be sent to the opponent (handled by
    // A's channel client, which then is "dequeued" on A's channel client
    // and sent to B's app (handled by B's channel client here) and
    // pushed from B's app to B's wallet.
    // The de/queuing described above is effectively faked by explicitly passing
    // the messages between the clients.
    clientA.onMessageQueued(async (message: Message<ChannelResult>) => {
      await clientB.pushMessage(message);
    });

    clientB.onMessageQueued(async (message: Message<ChannelResult>) => {
      await clientA.pushMessage(message);
    });

    clientB.onChannelProposed((result: ChannelResult) => {
      clientBEventEmitter.emit('ChannelProposed', result);
    });
  });

  describe('creates a channel', () => {
    let proposalMessage: Message<ChannelResult>;

    it('client A produces the right channel result', async () => {
      const clientAChannelState = await clientA.createChannel(
        participants,
        allocations,
        APP_DEFINITION,
        APP_DATA
      );
      expect(clientAChannelState).toEqual(states['proposed']);

      proposalMessage = {
        sender: clientA.address,
        recipient: clientB.address,
        data: clientAChannelState
      };
    });

    it('client B gets proposal', async () => {
      setClientStates([clientA, clientB], states['proposed']);

      return new Promise(resolve => {
        clientBEventEmitter.once('ChannelProposed', () => {
          expect(clientB.latestState).toEqual(states['proposed']);
          resolve();
        });

        clientB.pushMessage(proposalMessage);
      });
    });
  });

  describe('joins a channel', () => {
    it('the player whose turn it is can accept proposal to join the channel', async () => {
      setClientStates([clientA], states['running']);
      setClientStates([clientB], states['proposed']);
      const channelResult = await clientB.joinChannel(channelId);
      expect(channelResult).toEqual(states['running']);
      expect(clientA.latestState).toEqual(states['running']);
    });

    it('the player whose turn it is not cannot accept a join proposal they sent', async () => {
      setClientStates([clientA, clientB], states['proposed']);
      await expect(clientA.joinChannel(channelId)).rejects.toBeDefined();
    });
  });

  describe('updates a channel', () => {
    it('the player whose turn it is can update the channel', async () => {
      setClientStates([clientA, clientB], states['running']);
      const channelResult = await clientA.updateChannel(
        channelId,
        participants,
        allocations,
        UPDATED_APP_DATA
      );
      expect(channelResult).toEqual(states['updated_app_data']);
      expect(clientB.latestState).toEqual(states['updated_app_data']);
    });

    it('the player whose turn it is not cannot update the channel', async () => {
      setClientStates([clientA, clientB], states['running']);
      await expect(
        clientB.updateChannel(channelId, participants, allocations, UPDATED_APP_DATA)
      ).rejects.toBeDefined();
    });
  });

  describe('closes a channel', () => {
    it('player with valid turn can make a valid close channel call', async () => {
      setClientStates([clientA, clientB], states['running']);
      // Since the clients agree to close a channel, this skips the 'closing'
      // phase and the clients directly go to the channel 'closed' state
      const channelResult = await clientA.closeChannel(channelId);
      expect(channelResult).toEqual(states['closed']);
      expect(clientB.latestState).toEqual(states['closed']);
    });

    it('player with invalid turn cannot make a valid close channel call', async () => {
      setClientStates([clientA, clientB], states['running']);
      await expect(clientB.closeChannel(channelId)).rejects.toBeDefined();
    });
  });
});
