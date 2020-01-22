import { ethers } from 'ethers';
import waitForExpect from 'wait-for-expect';
import { interpret } from 'xstate';
import { AddressZero, HashZero } from 'ethers/constants';

import { Init, machine, CreateChannelEvent } from '../protocols/wallet/protocol';
import { Store } from '../store';
import { messageService } from '../messaging';
import { AddressableMessage } from '../wire-protocol';
import { log } from '../utils';
import { Chain } from '../chain';

import { processStates } from './utils';
import { first, second, wallet1, wallet2, participants } from './data';

const logProcessStates = state => {
  log(processStates(state));
};

const createChannel: CreateChannelEvent = {
  type: 'CREATE_CHANNEL',
  chainId: '0x01',
  challengeDuration: 1,
  participants,
  allocations: [
    { destination: first.destination, amount: '3' },
    { destination: second.destination, amount: '1' },
  ],
  appDefinition: AddressZero,
  appData: HashZero,
};

const chain = new Chain();

const connect = (wallet: ethers.Wallet) => {
  const store = new Store({
    privateKeys: { [wallet.address]: wallet.privateKey },
    chain,
  });
  const participantId =
    wallet.address === first.signingAddress ? first.participantId : second.participantId;

  const context: Init = {
    id: participantId,
    processes: [],
  };
  const service = interpret<any, any, any>(machine(store, context));

  service.onTransition(state => {
    setTimeout(() => logProcessStates(state), 100);
  });

  messageService.on('message', ({ to, ...event }: AddressableMessage) => {
    if (to === context.id) {
      service.send(event);
    }
  });

  service.start();

  return [service, store] as [typeof service, typeof store];
};

test('opening a channel', async () => {
  const [left] = connect(wallet1);
  connect(wallet2);

  left.send(createChannel);

  await waitForExpect(() => {
    const process = left.state.context.processes[0];
    expect(process && process.ref.state.value).toEqual('success');
  }, 2000);
});
