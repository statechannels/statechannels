import { ethers } from 'ethers';
import waitForExpect from 'wait-for-expect';
import { interpret } from 'xstate';

import { Store, Participant } from '../store';
import { messageService } from '../messaging';
import { AddressableMessage } from '../wire-protocol';
import { log } from '../utils';
import { Chain } from '../chain';
import { VirtualLeaf, VirtualHub } from '../protocols';
import { MachineFactory } from '../machine-utils';

import { processStates } from './utils';
import { wallet1, wallet2, participants, storeWithUnfundedChannel } from './data';

jest.setTimeout(10000);

const logProcessStates = state => {
  log(processStates(state));
};

const chain = new Chain();

const stores: Record<string, Store> = {};

type T = VirtualLeaf.Init;
function connect(
  wallet: ethers.Wallet,
  machineConstructor: MachineFactory<T, any>,
  { participantId }: Participant
) {
  const store = storeWithUnfundedChannel(chain, wallet.privateKey);

  const context: T = {} as T;
  stores[participantId] = store;
  const service = interpret<any, any, any>(machineConstructor(store, context));

  service.onTransition(state => {
    setTimeout(() => logProcessStates(state), 100);
  });

  stores[participantId] = store;
  messageService.on('message', ({ to, ...event }: AddressableMessage) => {
    if (to === participantId && event.type === 'SendStates') {
      store.receiveStates(event.signedStates);
    }
  });

  service.start();
  return service;
}

test('virtually funding a channel', async () => {
  const wallet3: any = {};
  const left = connect(wallet1, VirtualLeaf.machine, participants[0]);
  const hub = connect(wallet2, VirtualHub.machine, participants[1]);
  const right = connect(wallet3, VirtualLeaf.machine, participants[2]);

  // TODO
  let virtualFundAppChannel;

  left.send(virtualFundAppChannel);
  // left should send right a message, so this should be enough

  await waitForExpect(() => {
    expect(left.state.value).toEqual('success');
    expect(hub.state.value).toEqual('success');
    expect(right.state.value).toEqual('success');
  }, 200);
});
