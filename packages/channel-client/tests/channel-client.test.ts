import log = require('loglevel');
import EventEmitter = require('eventemitter3');

import {Message, ChannelResult} from '@statechannels/client-api-schema';

import {ChannelClient} from '../src';
import {EventsWithArgs} from '../src/types';
import {calculateChannelId} from '../src/utils';

import {ChannelResultBuilder, buildParticipant, buildAllocation, setProviderStates} from './utils';
import {
  PARTICIPANT_A,
  PARTICIPANT_B,
  APP_DEFINITION,
  APP_DATA,
  UPDATED_APP_DATA
} from './constants';
import {FakeChannelProvider} from './fakes/fake-channel-provider';

log.setDefaultLevel(log.levels.SILENT);

interface StateMap {
  [channelStatus: string]: ChannelResult;
}

interface Addresses {
  self: string;
  opponent: string;
}

describe('ChannelClient with FakeChannelProvider', () => {
  const participantA = buildParticipant(PARTICIPANT_A);
  const participantB = buildParticipant(PARTICIPANT_B);

  const states: StateMap = {};
  const participants = [participantA, participantB];
  const allocations = [buildAllocation(PARTICIPANT_A, '5'), buildAllocation(PARTICIPANT_B, '5')];
  const channelId = calculateChannelId(participants, APP_DEFINITION);

  // This event emitter enables easier assertions of expected
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
      0,
      'proposed'
    ).build();

    states['running'] = ChannelResultBuilder.from(states['proposed'])
      .setStatus('running')
      .setTurnNum(3)
      .build();

    states['updated_app_data'] = ChannelResultBuilder.from(states['running'])
      .setAppData(UPDATED_APP_DATA)
      .setTurnNum(4)
      .build();

    states['closed'] = ChannelResultBuilder.from(states['running'])
      .setStatus('closed')
      .setTurnNum(5)
      .build();
  });

  function setupProvider(
    provider: FakeChannelProvider,
    playerIndex: 0 | 1,
    addresses: Addresses
  ): void {
    provider.setAddress(addresses.self);
    provider.updatePlayerIndex(channelId, playerIndex);
    provider.opponentAddress[channelId] = addresses.opponent;
  }

  beforeEach(() => {
    providerA = new FakeChannelProvider();
    providerB = new FakeChannelProvider();

    providerA.enable();
    providerB.enable();

    clientA = new ChannelClient(providerA);
    clientB = new ChannelClient(providerB);

    setupProvider(providerA, 0, {
      self: participantA.participantId,
      opponent: participantB.participantId
    });

    setupProvider(providerB, 1, {
      self: participantB.participantId,
      opponent: participantA.participantId
    });

    // This setup simulates the message being received from A's wallet
    // and "queued" by A's app to be sent to the opponent (handled by
    // A's channel client, which then is "dequeued" on A's channel client
    // and sent to B's app (handled by B's channel client here) and
    // pushed from B's app to B's wallet.
    // The de/queuing described above is effectively faked by explicitly passing
    // the messages between the clients.
    clientA.onMessageQueued(async (message: Message) => {
      await clientB.pushMessage(message);
    });

    clientB.onMessageQueued(async (message: Message) => {
      await clientA.pushMessage(message);
    });

    clientB.onChannelProposed((result: ChannelResult) => {
      clientBEventEmitter.emit('ChannelProposed', result);
    });
  });

  describe('creates a channel', () => {
    let proposalMessage: Message;

    it('client A produces the right channel result', async () => {
      const clientAChannelState = await clientA.createChannel(
        participants,
        allocations,
        APP_DEFINITION,
        APP_DATA,
        'Direct'
      );
      expect(clientAChannelState).toEqual(states['proposed']);

      proposalMessage = {
        sender: clientA.signingAddress as string,
        recipient: clientB.signingAddress as string,
        data: clientAChannelState
      };
    });

    it('client B gets proposal', async () => {
      setProviderStates([providerA, providerB], states['proposed']);

      return new Promise(resolve => {
        clientBEventEmitter.once('ChannelProposed', () => {
          expect(providerB.latestState[channelId]).toEqual(states['proposed']);
          resolve();
        });

        clientB.pushMessage(proposalMessage);
      });
    });
  });

  describe('joins a channel', () => {
    it('the player whose turn it is can accept proposal to join the channel', async () => {
      setProviderStates([providerA], states['running']);
      setProviderStates([providerB], states['proposed']);
      const channelResult = await clientB.joinChannel(channelId);
      expect(channelResult).toEqual(states['running']);
      expect(providerA.latestState[channelId]).toEqual(states['running']);
    });

    it('the player whose turn it is not cannot accept a join proposal they sent', async () => {
      setProviderStates([providerA, providerB], states['proposed']);
      await expect(clientA.joinChannel(channelId)).rejects.toBeDefined();
    });
  });

  describe('updates a channel', () => {
    it('the player whose turn it is can update the channel', async () => {
      setProviderStates([providerA, providerB], states['running']);
      const channelResult = await clientA.updateChannel(channelId, allocations, UPDATED_APP_DATA);
      expect(channelResult).toEqual(states['updated_app_data']);
      expect(providerB.latestState[channelId]).toEqual(states['updated_app_data']);
    });

    it('the player whose turn it is not cannot update the channel', async () => {
      setProviderStates([providerA, providerB], states['running']);
      await expect(
        clientB.updateChannel(channelId, allocations, UPDATED_APP_DATA)
      ).rejects.toBeDefined();
    });
  });

  describe('gets state from a channel', () => {
    it('anyone can get state', async () => {
      setProviderStates([providerA, providerB], states['running']);
      const channelResult = await clientA.getState(channelId);
      expect(channelResult).toEqual(states['running']);
      expect(providerB.latestState[channelId]).toEqual(states['running']);
    });
  });

  describe('closes a channel', () => {
    it('player with valid turn can make a valid close channel call', async () => {
      setProviderStates([providerA, providerB], states['running']);
      // Since the clients agree to close a channel, this skips the 'closing'
      // phase and the clients directly go to the channel 'closed' state
      const channelResult = await clientA.closeChannel(channelId);
      expect(channelResult).toEqual(states['closed']);
      expect(providerB.latestState[channelId]).toEqual(states['closed']);
    });

    it('player with invalid turn cannot make a valid close channel call', async () => {
      setProviderStates([providerA, providerB], states['running']);
      await expect(clientB.closeChannel(channelId)).rejects.toBeDefined();
    });
  });
});
