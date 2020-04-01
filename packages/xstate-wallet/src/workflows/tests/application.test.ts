import {interpret} from 'xstate';
import {ethers} from 'ethers';
import waitForExpect from 'wait-for-expect';
import {AddressZero} from 'ethers/constants';
import {XstateStore, Store} from '../../store';
import {StateVariables, SignedState} from '../../store/types';
import {ChannelStoreEntry} from '../../store/channel-store-entry';
import {MessagingService, MessagingServiceInterface, isChannelUpdated} from '../../messaging';
import {bigNumberify} from 'ethers/utils';
import {calculateChannelId} from '../../store/state-utils';
import {simpleEthAllocation} from '../../utils';
import {ChannelUpdated, JoinChannelEvent} from '../../event-types';
import {Application} from '..';
import {filter, first} from 'rxjs/operators';

jest.setTimeout(10000);
// const createChannelEvent: CreateChannelEvent = {
//   type: 'CREATE_CHANNEL',
//   chainId: '0x0',
//   appData: '0x0',
//   appDefinition: ethers.constants.AddressZero,
//   participants: [],
//   outcome: simpleEthAllocation([]),
//   challengeDuration: bigNumberify(500),
//   requestId: 5,
//   fundingStrategy: 'Direct'
// };

describe('Channel setup, JOIN_CHANNEL role', () => {
  let service: ReturnType<typeof interpret>;
  const channelId = '0xabc';
  const context: Application.Init = {
    fundingStrategy: 'Direct',
    channelId,
    type: 'JOIN_CHANNEL',
    applicationSite: 'localhost'
  };
  let store: Store;
  let messagingService: MessagingServiceInterface;

  beforeEach(async () => {
    store = new XstateStore();
    await store.initialize();
    messagingService = new MessagingService(store);

    service = interpret<any, any, any>(Application.workflow(store, messagingService, context));
  });

  test('with direct funding strategy', async () => {
    service.start();

    // It invokes confirmingWithUser
    await waitForExpect(async () => {
      expect(service.state.value).toEqual('confirmingWithUser');
    }, 2000);

    service.state.children.invokeCreateChannelConfirmation.send({type: 'USER_APPROVES'});

    await waitForExpect(async () => expect(service.state.value).toEqual('joiningChannel'), 2000);

    const joinEvent: JoinChannelEvent = {
      type: 'JOIN_CHANNEL',
      channelId,
      requestId: 5,
      applicationSite: 'localhost'
    };

    service.send(joinEvent);

    return messagingService.outboxFeed
      .pipe(
        filter(isChannelUpdated),
        filter(m => m.params.status === 'running'),
        first()
      )
      .toPromise();
  });
});

it('raises an channel updated action when the channel is updated', async () => {
  const store = new XstateStore();
  await store.initialize();
  const messagingService: MessagingServiceInterface = new MessagingService(store);
  const mockOptions = {
    actions: {
      sendChannelUpdatedNotification: jest.fn()
    }
  };
  const service = interpret<any, any, any>(
    Application.workflow(store, messagingService).withConfig(mockOptions, {
      fundingStrategy: 'Direct',
      applicationSite: 'localhost'
    })
  );
  service.start();

  service.send({
    type: 'CHANNEL_UPDATED',
    channelId: '0x0'
  });

  await waitForExpect(async () => {
    expect(mockOptions.actions.sendChannelUpdatedNotification).toHaveBeenCalled();
  }, 2000);
});

it('starts concluding when requested', async () => {
  const store = new XstateStore();
  await store.initialize();
  const messagingService: MessagingServiceInterface = new MessagingService(store);
  const channelId = ethers.utils.id('channel');
  const services: Partial<Application.WorkflowServices> = {
    signConcludeState: jest.fn().mockReturnValue(Promise.resolve()),
    invokeClosingProtocol: jest.fn().mockReturnValue(
      new Promise(() => {
        /* mock */
      })
    )
  };
  const actions: Partial<Application.WorkflowActions> = {
    sendCloseChannelResponse: jest.fn().mockReturnValue(
      new Promise(() => {
        /* mock */
      })
    )
  };
  const service = interpret<any, any, any>(
    Application.workflow(store, messagingService).withConfig(
      {services, actions} as any, // TODO: Casting
      {fundingStrategy: 'Direct', applicationSite: 'localhost'}
    )
  );
  service.start('running');
  service.send({type: 'PLAYER_REQUEST_CONCLUDE', channelId});
  await waitForExpect(async () => {
    expect(service.state.value).toEqual('closing');
    expect(services.invokeClosingProtocol).toHaveBeenCalled();
    expect(service.state.actions.map(a => a.type)).toContain('displayUi');
  }, 2000);
});

it('starts concluding when receiving a final state', async () => {
  const store = new XstateStore();
  await store.initialize();
  const messagingService: MessagingServiceInterface = new MessagingService(store);
  const states: SignedState[] = [
    {
      isFinal: true,
      appDefinition: AddressZero,
      appData: '0x0',
      outcome: simpleEthAllocation([]),
      turnNum: bigNumberify(55),
      challengeDuration: bigNumberify(500),
      chainId: '0x0',
      channelNonce: bigNumberify('0x0'),
      participants: [],
      signatures: ['0x0']
    }
  ];
  const services: Partial<Application.WorkflowServices> = {
    invokeClosingProtocol: jest.fn().mockReturnValue(
      new Promise(() => {
        /* mock */
      })
    ),
    signConcludeState: jest.fn().mockReturnValue(Promise.resolve())
  };
  const channelId = calculateChannelId(states[0]);
  const channelUpdate: ChannelUpdated = {
    type: 'CHANNEL_UPDATED',
    requestId: 5,
    storeEntry: {
      latest: {isFinal: true} as StateVariables
    } as ChannelStoreEntry
  };

  const service = interpret<any, any, any>(
    Application.workflow(store, messagingService).withConfig(
      {services} as any, //TODO: Casting
      {channelId, fundingStrategy: 'Direct', applicationSite: 'localhost'}
    )
  );
  service.start('running');

  service.send(channelUpdate);

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('closing');
    expect(services.invokeClosingProtocol).toHaveBeenCalled();
  });
});
