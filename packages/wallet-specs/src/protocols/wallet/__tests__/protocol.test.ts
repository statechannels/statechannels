import { Init, machine, CreateChannelEvent, Process } from '../protocol';
import { ethers } from 'ethers';
import { Store, Participant } from '../../../store';
import waitForExpect from 'wait-for-expect';
import { interpret, Actor } from 'xstate';
import { messageService } from '../../../messaging';
import { AddressableMessage } from '../../../wire-protocol';
import { AddressZero, HashZero } from 'ethers/constants';

function invokedState(actor: Actor, prefix = '    '): string {
  if (actor.state) {
    const childState = Object.values(actor.state.children).map((child: Actor) =>
      invokedState(child, prefix.concat('  '))
    );

    return [`${prefix}${JSON.stringify(actor.state.value)}\n`].concat(childState).join('\n');
  } else {
    return `${prefix}${actor.id}\n`;
  }
}

const logProcessStates = process.env ? state => console.log(processStates(state)) : () => {};

function processStates(state): string {
  const vals = state.context.processes.map((p: Process) => {
    return [`  PROCESS: ${p.id}`]
      .concat([`  STATE: ${JSON.stringify(p.ref.state.value)}`])
      .concat(
        Object.values(p.ref.state.children).map(child => {
          return invokedState(child);
        })
      )
      .join('\n');
  });

  return `WALLET: ${state.context.id}\n${vals}`;
}

const wallet1 = new ethers.Wallet(
  '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318'
); // 0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf
const wallet2 = new ethers.Wallet(
  '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727'
); // 0x2222E21c8019b14dA16235319D34b5Dd83E644A9
const first: Participant = {
  signingAddress: wallet1.address,
  destination: '0x0000000000000000000000000000000000000000000000000000000000000001',
  participantId: 'first',
};
const second: Participant = {
  signingAddress: wallet2.address,
  destination: '0x0000000000000000000000000000000000000000000000000000000000000002',
  participantId: 'second',
};
const participants = [first, second];

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

const connect = (wallet: ethers.Wallet) => {
  const store = new Store({
    privateKeys: { [wallet.address]: wallet.privateKey },
  });
  const participantId =
    wallet.address === first.signingAddress ? first.participantId : second.participantId;

  const context: Init = {
    id: participantId,
    processes: [],
  };
  const service = interpret<any, any, any>(machine(store, context)).onTransition(state =>
    logProcessStates(state)
  );

  messageService.on('message', ({ to, ...event }: AddressableMessage) => {
    if (to === context.id) {
      service.send(event);
    }
  });

  service.start();

  return [service, store] as [typeof service, typeof store];
};

it('works', async () => {
  const [left] = connect(wallet1);
  connect(wallet2);

  left.send(createChannel);

  await waitForExpect(() => {
    const process = left.state.context.processes[0];
    expect(process && process.ref.state.value).toEqual('foo');
  }, 2000);
});
