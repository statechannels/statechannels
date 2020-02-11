import {interpret} from 'xstate';
import {ethers} from 'ethers';
import waitForExpect from 'wait-for-expect';
import {
  EphemeralObsoleteStore,
  CreateChannelEvent,
  SignedState,
  getChannelId,
  ChannelUpdated
} from '@statechannels/wallet-protocols';
import {applicationWorkflow, OpenChannelEvent, WorkflowServices} from '../application';
import {AddressZero} from 'ethers/constants';

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
  const store = new EphemeralObsoleteStore();
  const services: Partial<WorkflowServices> = {
    invokeCreateChannelConfirmation: jest.fn().mockReturnValue(
      new Promise(() => {
        /* mock */
      })
    )
  };

  const service = interpret<any, any, any>(
    applicationWorkflow(store).withConfig({services} as any) // TODO: We shouldn't need to cast
  );
  service.start();
  service.send(createChannelEvent);
  await waitForExpect(async () => {
    expect(service.state.value).toEqual('confirmCreateChannelWorkflow');
    expect(services.invokeCreateChannelConfirmation).toHaveBeenCalled();
  }, 2000);
});

it('invokes the createChannelAndFund protocol', async () => {
  const store = new EphemeralObsoleteStore();
  const services: Partial<WorkflowServices> = {
    invokeCreateChannelAndDirectFundProtocol: jest.fn().mockReturnValue(
      new Promise(() => {
        /* mock */
      })
    )
  };

  const service = interpret<any, any, any>(
    applicationWorkflow(store).withConfig({services} as any) // TODO: We shouldn't need to cast
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
  const store = new EphemeralObsoleteStore();
  const mockOptions = {
    actions: {
      sendChannelUpdatedNotification: jest.fn()
    }
  };
  const service = interpret<any, any, any>(applicationWorkflow(store).withConfig(mockOptions));
  service.start();

  service.send({
    type: 'CHANNEL_UPDATED',
    channelId: '0x0'
  });

  await waitForExpect(async () => {
    expect(mockOptions.actions.sendChannelUpdatedNotification).toHaveBeenCalled();
  }, 2000);
});

it('handles confirmCreateChannel workflow finishing', async () => {
  const store = new EphemeralObsoleteStore();
  const services: Partial<WorkflowServices> = {
    createChannel: jest.fn().mockReturnValue(Promise.resolve('0xb1ab1a')),
    invokeCreateChannelAndDirectFundProtocol: jest.fn().mockReturnValue(
      new Promise(() => {
        /*mock*/
      })
    )
  };

  const service = interpret<any, any, any>(
    applicationWorkflow(store).withConfig({services} as any)
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
  const store = new EphemeralObsoleteStore();
  const event: OpenChannelEvent = {
    type: 'OPEN_CHANNEL',
    channelId: '0xabc'
  };
  const service = interpret<any, any, any>(applicationWorkflow(store));

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
  const store = new EphemeralObsoleteStore();
  const channelId = ethers.utils.id('channel');
  const services: Partial<WorkflowServices> = {
    invokeClosingProtocol: jest.fn().mockReturnValue(
      new Promise(() => {
        /* mock */
      })
    )
  };
  const service = interpret<any, any, any>(
    applicationWorkflow(store).withConfig({services} as any)
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
  const store = new EphemeralObsoleteStore();
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
    channelId,
    entry: {states, channel: states[0].state.channel, privateKey: '0x0', participants: []}
  };

  const service = interpret<any, any, any>(
    applicationWorkflow(store, {channelId}).withConfig({services} as any)
  ); //TODO: Casting
  service.start('running');

  service.send(channelUpdate);

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('closing');
    expect(services.invokeClosingProtocol).toHaveBeenCalled();
  });
});
