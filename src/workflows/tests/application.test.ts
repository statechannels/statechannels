import {interpret} from 'xstate';
import {ethers} from 'ethers';
import waitForExpect from 'wait-for-expect';
import {CreateChannelEvent, SignedState, getChannelId} from '@statechannels/wallet-protocols';
import {
  applicationWorkflow,
  JoinChannelEvent,
  WorkflowServices,
  ChannelUpdated
} from '../application';
import {AddressZero} from 'ethers/constants';
import {MemoryStore, Store} from '../../store/memory-store';
import {StateVariables} from '../../store/types';
import {ChannelStoreEntry} from '../../store/memory-channel-storage';
import {MessagingService, MessagingServiceInterface} from '../../messaging';

jest.setTimeout(50000);
const createChannelEvent: CreateChannelEvent = {
  type: 'CREATE_CHANNEL',
  chainId: '0x0',
  appData: '0x0',
  appDefinition: ethers.constants.AddressZero,
  participants: [],
  allocations: [],
  challengeDuration: 500
};

it('initializes and starts confirmCreateChannelWorkflow', async () => {
  const store = new MemoryStore();
  const messagingService: MessagingServiceInterface = new MessagingService(store);
  const services: Partial<WorkflowServices> = {
    invokeCreateChannelConfirmation: jest.fn().mockReturnValue(
      new Promise(() => {
        /* mock */
      })
    )
  };

  const service = interpret<any, any, any>(
    applicationWorkflow(store, messagingService).withConfig({services} as any) // TODO: We shouldn't need to cast
  );
  service.start();
  service.send(createChannelEvent);
  await waitForExpect(async () => {
    expect(service.state.value).toEqual({
      confirmCreateChannelWorkflow: 'invokeCreateChannelConfirmation'
    });
    expect(services.invokeCreateChannelConfirmation).toHaveBeenCalled();
  }, 2000);
});

it('invokes the createChannelAndFund protocol', async () => {
  const store = new MemoryStore();
  const messagingService: MessagingServiceInterface = new MessagingService(store);
  const services: Partial<WorkflowServices> = {
    invokeCreateChannelAndDirectFundProtocol: jest.fn().mockReturnValue(
      new Promise(() => {
        /* mock */
      })
    )
  };

  const service = interpret<any, any, any>(
    applicationWorkflow(store, messagingService).withConfig({services} as any) // TODO: We shouldn't need to cast
  );

  const channelId = '0xabc';
  service.start('createChannelInStore');

  service.send({type: 'done.invoke.createChannel', data: channelId});
  await waitForExpect(async () => {
    expect(service.state.value).toEqual('openChannelAndDirectFundProtocol');
    expect(services.invokeCreateChannelAndDirectFundProtocol).toHaveBeenCalledWith(
      expect.objectContaining({channelId}),
      expect.any(Object)
    );
  }, 2000);
});

it('raises an channel updated action when the channel is updated', async () => {
  const store = new MemoryStore();
  const messagingService: MessagingServiceInterface = new MessagingService(store);
  const mockOptions = {
    actions: {
      sendChannelUpdatedNotification: jest.fn()
    }
  };
  const service = interpret<any, any, any>(
    applicationWorkflow(store, messagingService).withConfig(mockOptions)
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
// TODO: Fix this
// eslint-disable-next-line jest/no-disabled-tests
it.skip('handles confirmCreateChannel workflow finishing', async () => {
  const store = new MemoryStore();
  const messagingService: MessagingServiceInterface = new MessagingService(store);
  const services: Partial<WorkflowServices> = {
    createChannel: jest.fn().mockReturnValue(Promise.resolve('0xb1ab1a')),
    invokeCreateChannelAndDirectFundProtocol: jest.fn().mockReturnValue(
      new Promise(() => {
        /*mock*/
      })
    )
  };

  const service = interpret<any, any, any>(
    applicationWorkflow(store, messagingService).withConfig({services} as any)
  ); //TODO: Casting
  service.start('confirmCreateChannelWorkflow');

  service.send({
    type: 'done.invoke.invokeCreateChannelConfirmation',
    data: createChannelEvent
  });

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('openChannelAndDirectFundProtocol');
    expect(service.state.context).toMatchObject({channelId: '0xb1ab1a'});
  }, 2000);
});

it('initializes and starts the join channel machine', async () => {
  const store = new MemoryStore();
  const messagingService: MessagingServiceInterface = new MessagingService(store);
  const event: JoinChannelEvent = {
    type: 'JOIN_CHANNEL',
    channelId: '0xabc'
  };
  const service = interpret<any, any, any>(applicationWorkflow(store, messagingService));

  service.start();

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('initializing');
  }, 2000);

  service.send(event);

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('waitForJoin');
    expect(service.state.context).toBeDefined();
    expect(service.state.context.channelId).toEqual('0xabc');
  }, 2000);
});

it('starts concluding when requested', async () => {
  const store: Store = new MemoryStore();
  const messagingService: MessagingServiceInterface = new MessagingService(store);
  const channelId = ethers.utils.id('channel');
  const services: Partial<WorkflowServices> = {
    invokeClosingProtocol: jest.fn().mockReturnValue(
      new Promise(() => {
        /* mock */
      })
    )
  };
  const service = interpret<any, any, any>(
    applicationWorkflow(store, messagingService).withConfig({services} as any)
  ); // TODO: Casting
  service.start('running');
  service.send({type: 'PLAYER_REQUEST_CONCLUDE', channelId});
  await waitForExpect(async () => {
    expect(service.state.value).toEqual('closing');
    expect(services.invokeClosingProtocol).toHaveBeenCalled();
    expect(service.state.actions.map(a => a.type)).toContain('displayUi');
  }, 2000);
});

it('starts concluding when receiving a final state', async () => {
  const store = new MemoryStore();
  const messagingService: MessagingServiceInterface = new MessagingService(store);
  const states: SignedState[] = [
    {
      state: {
        isFinal: true,
        appDefinition: AddressZero,
        appData: '0x0',
        outcome: [],
        turnNum: 55,
        challengeDuration: 500,
        channel: {chainId: '0x0', channelNonce: '0x0', participants: []}
      },
      signatures: []
    }
  ];
  const services: Partial<WorkflowServices> = {
    invokeClosingProtocol: jest.fn().mockReturnValue(
      new Promise(() => {
        /* mock */
      })
    )
  };
  const channelId = getChannelId(states[0].state.channel);
  const channelUpdate: ChannelUpdated = {
    type: 'CHANNEL_UPDATED',
    storeEntry: {
      latestSupportedByMe: {isFinal: true} as StateVariables
    } as ChannelStoreEntry
  };

  const service = interpret<any, any, any>(
    applicationWorkflow(store, messagingService, {channelId}).withConfig({services} as any)
  ); //TODO: Casting
  service.start('running');

  service.send(channelUpdate);

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('closing');
    expect(services.invokeClosingProtocol).toHaveBeenCalled();
  });
});
