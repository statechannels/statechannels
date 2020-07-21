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
  PARTICIPANT_C,
  APP_DEFINITION,
  APP_DATA,
  UPDATED_APP_DATA
} from './constants';
import {FakeChannelProvider} from './fakes/fake-channel-provider';

log.setDefaultLevel(log.levels.SILENT);

interface StateMap {
  [channelStatus: string]: ChannelResult;
}

describe('FakeChannelClient', () => {
  const participantA = buildParticipant(PARTICIPANT_A);
  const participantB = buildParticipant(PARTICIPANT_B);
  const participantC = buildParticipant(PARTICIPANT_C);

  const statesAB: StateMap = {};
  const statesAC: StateMap = {};
  const participantsAB = [participantA, participantB];
  const participantsAC = [participantA, participantC];
  const allocationsAB = [buildAllocation(PARTICIPANT_A, '5'), buildAllocation(PARTICIPANT_B, '5')];
  const allocationsAC = [buildAllocation(PARTICIPANT_A, '5'), buildAllocation(PARTICIPANT_C, '5')];
  const channelIdAB = calculateChannelId(participantsAB, APP_DEFINITION);
  const channelIdAC = calculateChannelId(participantsAC, APP_DEFINITION);

  // This event emitter only enable easier assertions of expected
  // events the client is listening on
  const clientBEventEmitter = new EventEmitter<EventsWithArgs>();
  const clientCEventEmitter = new EventEmitter<EventsWithArgs>();

  let clientA: ChannelClient, clientB: ChannelClient, clientC: ChannelClient;
  let providerA: FakeChannelProvider,
    providerB: FakeChannelProvider,
    providerC: FakeChannelProvider;

  beforeAll(() => {
    statesAB['proposed'] = new ChannelResultBuilder(
      participantsAB,
      allocationsAB,
      APP_DEFINITION,
      APP_DATA,
      channelIdAB,
      0,
      'proposed'
    ).build();

    statesAB['running'] = ChannelResultBuilder.from(statesAB['proposed'])
      .setStatus('running')
      .setTurnNum(3)
      .build();

    statesAB['updated_app_data'] = ChannelResultBuilder.from(statesAB['running'])
      .setAppData(UPDATED_APP_DATA)
      .setTurnNum(4)
      .build();

    statesAB['closed'] = ChannelResultBuilder.from(statesAB['running'])
      .setStatus('closed')
      .setTurnNum(5)
      .build();

    statesAC['proposed'] = new ChannelResultBuilder(
      participantsAC,
      allocationsAC,
      APP_DEFINITION,
      APP_DATA,
      channelIdAC,
      0,
      'proposed'
    ).build();

    statesAC['running'] = ChannelResultBuilder.from(statesAC['proposed'])
      .setStatus('running')
      .setTurnNum(3)
      .build();

    statesAC['updated_app_data'] = ChannelResultBuilder.from(statesAC['running'])
      .setAppData(UPDATED_APP_DATA)
      .setTurnNum(4)
      .build();

    statesAC['closed'] = ChannelResultBuilder.from(statesAC['running'])
      .setStatus('closed')
      .setTurnNum(5)
      .build();
  });

  beforeEach(() => {
    providerA = new FakeChannelProvider();
    providerA.internalAddress = participantA.signingAddress;
    providerB = new FakeChannelProvider();
    providerB.internalAddress = participantB.signingAddress;
    providerC = new FakeChannelProvider();
    providerC.internalAddress = participantC.signingAddress;

    clientA = new ChannelClient(providerA);
    clientB = new ChannelClient(providerB);
    clientC = new ChannelClient(providerC);

    providerA.updatePlayerIndex(channelIdAB, 0);
    providerA.opponentAddress[channelIdAB] = participantB.participantId;

    providerB.updatePlayerIndex(channelIdAB, 1);
    providerB.opponentAddress[channelIdAB] = participantA.participantId;

    providerC.updatePlayerIndex(channelIdAC, 1);
    providerC.opponentAddress[channelIdAC] = participantA.participantId;

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

    clientC.onMessageQueued(async (message: Message) => {
      await clientA.pushMessage(message);
    });

    clientC.onChannelProposed((result: ChannelResult) => {
      clientCEventEmitter.emit('ChannelProposed', result);
    });
  });

  describe('client A creates channels', () => {
    let proposalMessageB: Message, proposalMessageC: Message;

    it('client A produces the right channel result', async () => {
      const clientChannelStateAB = await clientA.createChannel(
        participantsAB,
        allocationsAB,
        APP_DEFINITION,
        APP_DATA,
        'Direct'
      );
      expect(clientChannelStateAB).toEqual(statesAB['proposed']);

      proposalMessageB = {
        sender: participantA.participantId,
        recipient: participantB.participantId,
        data: clientChannelStateAB
      };

      const clientChannelStateAC = await clientA.createChannel(
        participantsAC,
        allocationsAC,
        APP_DEFINITION,
        APP_DATA,
        'Direct'
      );
      expect(clientChannelStateAC).toEqual(statesAC['proposed']);

      proposalMessageC = {
        sender: participantA.participantId,
        recipient: participantC.participantId,
        data: clientChannelStateAC
      };
    });

    it('client B gets proposal', async () => {
      setProviderStates([providerA, providerB], statesAB['proposed']);

      return new Promise(resolve => {
        clientBEventEmitter.once('ChannelProposed', () => {
          expect(providerB.latestState[channelIdAB]).toEqual(statesAB['proposed']);
          resolve();
        });

        clientB.pushMessage(proposalMessageB);
      });
    });

    it('client C also gets proposal', async () => {
      setProviderStates([providerA, providerC], statesAC['proposed']);

      return new Promise(resolve => {
        clientCEventEmitter.once('ChannelProposed', () => {
          expect(providerC.latestState[channelIdAC]).toEqual(statesAC['proposed']);
          resolve();
        });

        clientC.pushMessage(proposalMessageC);
      });
    });
  });

  describe('joins a channel', () => {
    it('the player whose turn it is can accept proposal to join the channel', async () => {
      setProviderStates([providerA], statesAB['running']);
      setProviderStates([providerB], statesAB['proposed']);
      setProviderStates([providerA], statesAC['running']);
      setProviderStates([providerC], statesAC['proposed']);

      const ChannelResultAB = await clientB.joinChannel(channelIdAB);
      expect(ChannelResultAB).toEqual(statesAB['running']);
      expect(providerB.latestState[channelIdAB]).toEqual(statesAB['running']);

      expect(providerC.latestState[channelIdAC]).toEqual(statesAC['proposed']);
    });

    it('the player whose turn it is not cannot accept a join proposal they sent', async () => {
      setProviderStates([providerA, providerB], statesAB['proposed']);
      await expect(clientA.joinChannel(channelIdAB)).rejects.toBeDefined();
    });
  });

  describe('updates a channel', () => {
    it('the player whose turn it is can update the channel', async () => {
      setProviderStates([providerA, providerB], statesAB['running']);
      setProviderStates([providerA, providerC], statesAC['running']);

      const ChannelResultAB = await clientA.updateChannel(
        channelIdAB,
        allocationsAB,
        UPDATED_APP_DATA
      );
      expect(ChannelResultAB).toEqual(statesAB['updated_app_data']);
      expect(providerB.latestState[channelIdAB]).toEqual(statesAB['updated_app_data']);

      expect(providerC.latestState[channelIdAC]).toEqual(statesAC['running']);
    });

    it('the player whose turn it is not cannot update the channel', async () => {
      setProviderStates([providerA, providerB], statesAB['running']);
      await expect(
        clientB.updateChannel(channelIdAB, allocationsAB, UPDATED_APP_DATA)
      ).rejects.toBeDefined();
    });
  });

  describe('closes a channel', () => {
    it('player with valid turn can make a valid close channel call', async () => {
      setProviderStates([providerA, providerB], statesAB['running']);
      setProviderStates([providerA, providerC], statesAC['running']);
      // Since the clients agree to close a channel, this skips the 'closing'
      // phase and the clients directly go to the channel 'closed' state
      const ChannelResult = await clientA.closeChannel(channelIdAB);
      expect(ChannelResult).toEqual(statesAB['closed']);
      expect(providerB.latestState[channelIdAB]).toEqual(statesAB['closed']);
      expect(providerC.latestState[channelIdAC]).toEqual(statesAC['running']);
    });

    it('player with invalid turn cannot make a valid close channel call', async () => {
      setProviderStates([providerA, providerB], statesAB['running']);
      await expect(clientB.closeChannel(channelIdAB)).rejects.toBeDefined();
    });
  });
});
