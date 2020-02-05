import {interpret} from 'xstate';
import {ethers} from 'ethers';
import waitForExpect from 'wait-for-expect';
import {
  EphemeralStore,
  CreateChannelEvent,
  ConcludeChannel,
  getChannelId,
  OpenChannelEvent,
  Channel,
  ChannelUpdated,
  SignedState
} from '@statechannels/wallet-protocols';
import {applicationWorkflow} from '../application';
import {AddressZero} from 'ethers/constants';
import {findCalledActions} from '../../utils/test-helpers';
import * as CCC from '../confirm-create-channel';
let closingMachineMock;

let channelConfirmationMock;
beforeEach(() => {
  // TODO: Is this the best way to mock
  closingMachineMock = jest.fn().mockReturnValue(
    new Promise(() => {
      /* mock, do nothing */
    })
  );
  Object.defineProperty(ConcludeChannel, 'machine', {
    value: closingMachineMock
  });

  channelConfirmationMock = jest.fn().mockReturnValue(
    new Promise(() => {
      /* mock */
    })
  );
  Object.defineProperty(CCC, 'confirmChannelCreationWorkflow', {
    value: channelConfirmationMock
  });
});

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
  const store = new EphemeralStore();

  const service = interpret<any, any, any>(applicationWorkflow(store, undefined));
  service.start();
  service.send(createChannelEvent);
  await waitForExpect(async () => {
    expect(service.state.value).toEqual('confirmCreateChannelWorkflow');
    expect(channelConfirmationMock).toHaveBeenCalled();
  }, 2000);
});

it.only('handles confirmCreateChannel workflow finishing', async () => {
  const store = new EphemeralStore();

  const service = interpret<any, any, any>(applicationWorkflow(store, undefined));
  service.start('confirmCreateChannelWorkflow');

  service.send({
    type: 'done.invoke.invokeCreateChannelConfirmation'
  });

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('openChannelAndDirectFund');
    // TODO: Are actions working?
    // expect(findCalledActions(service.state)).toContainEqual({
    //   actionType: 'spawnObserver',
    //   stateType: 'confirmCreateChannelWorkflow'
    // });
  }, 2000);
});

it('initializes and starts the join channel machine', async () => {
  const store = new EphemeralStore();
  const channel: Channel = {chainId: '0x0', channelNonce: '0x0', participants: []};
  const event: OpenChannelEvent = {
    type: 'OPEN_CHANNEL',
    participants: [],
    signedState: {
      state: {
        turnNum: 0,
        appData: '0x0',
        appDefinition: '0x0',
        outcome: [],
        isFinal: false,
        channel,
        challengeDuration: 500
      },
      signatures: []
    }
  };
  const service = interpret<any, any, any>(applicationWorkflow(store, undefined));

  service.start();

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('initializing');
  }, 2000);

  service.send(event);

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('waitForJoin');

    expect(findCalledActions(service.state)).toContainEqual({
      actionType: 'displayUi',
      stateType: 'waitForJoin'
    });
  }, 2000);

  await waitForExpect(async () => {
    expect(service.state.context).toBeDefined();
    expect(service.state.context.channelId).toEqual(getChannelId(channel));
  }, 2000);
});
it('starts concluding when requested', async () => {
  const store = new EphemeralStore();
  const channelId = ethers.utils.id('channel');
  const service = interpret<any, any, any>(applicationWorkflow(store, {channelId}));
  service.start('running');
  service.send({type: 'PLAYER_REQUEST_CONCLUDE', channelId});
  await waitForExpect(async () => {
    expect(service.state.value).toEqual('closing');
    expect(closingMachineMock).toHaveBeenCalled();
    expect(service.state.actions.map(a => a.type)).toContain('displayUi');
  }, 2000);
});

it('starts concluding when receiving a final state', async () => {
  const store = new EphemeralStore();
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
  const channelId = getChannelId(states[0].state.channel);
  const channelUpdate: ChannelUpdated = {
    type: 'CHANNEL_UPDATED',
    channelId,
    entry: {states, channel: states[0].state.channel, privateKey: '0x0', participants: []}
  };

  const service = interpret<any, any, any>(applicationWorkflow(store, {channelId}));
  service.start('running');

  service.send(channelUpdate);

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('closing');
    expect(closingMachineMock).toHaveBeenCalled();
    expect(findCalledActions(service.state)).toContainEqual({
      actionType: 'displayUi',
      stateType: 'closing'
    });
  }, 2000);
});
