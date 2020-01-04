import log = require('loglevel');
import EventEmitter = require('eventemitter3');

import {
  PARTICIPANT_A,
  PARTICIPANT_B,
  APP_DEFINITION,
  APP_DATA,
  UPDATED_APP_DATA
} from './constants';
import {
  ChannelResultBuilder,
  buildParticipant,
  buildAllocation,
  setClientStates,
  setProviderStates
} from './utils';
import {ChannelResult, Message, ChannelClient} from '../src';
import {EventsWithArgs} from '../src/types';
import {calculateChannelId} from '../src/utils';
import {FakeChannelClient} from './fakes/fake-channel-client';
import {FakeChannelProvider} from './fakes/fake-channel-provider';

log.setDefaultLevel(log.levels.SILENT);

interface StateMap {
  [channelStatus: string]: ChannelResult;
}

describe('ChannelClient with FakeChannelProvider', () => {
  const participantA = buildParticipant(PARTICIPANT_A);
  const participantB = buildParticipant(PARTICIPANT_B);

  const states: StateMap = {};
  const participants = [participantA, participantB];
  const allocations = [buildAllocation(PARTICIPANT_A, '5'), buildAllocation(PARTICIPANT_B, '5')];
  const channelId = calculateChannelId(participants, APP_DEFINITION);

  // This event emitter only enable easier assertions of expected
  // events the client is listening on
  const clientBEventEmitter = new EventEmitter<EventsWithArgs>();

  let providerA: FakeChannelProvider, providerB: FakeChannelProvider;
  let clientA: ChannelClient, clientB: ChannelClient;

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
    providerA = new FakeChannelProvider();
    providerA.setAddress(participantA.participantId);

    providerB = new FakeChannelProvider();
    providerB.setAddress(participantB.participantId);

    clientA = new ChannelClient(providerA);
    clientB = new ChannelClient(providerB);

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
        sender: await clientA.getAddress(),
        recipient: await clientB.getAddress(),
        data: clientAChannelState
      };
    });

    it('client B gets proposal', async () => {
      setProviderStates([providerA, providerB], states['proposed']);

      return new Promise(resolve => {
        clientBEventEmitter.once('ChannelProposed', (result: ChannelResult) => {
          expect(providerB.latestState).toEqual(states['proposed']);
          resolve();
        });

        clientB.pushMessage(proposalMessage);
      });
    });
  });
});
