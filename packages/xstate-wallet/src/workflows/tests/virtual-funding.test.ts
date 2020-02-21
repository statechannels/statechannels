import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';

import {Init, machine, Role} from '../virtualFunding';

import {MemoryStore, Store} from '../../store/memory-store';
import {ethers} from 'ethers';
import {bigNumberify} from 'ethers/utils';
import _ from 'lodash';
import {firstState, signState, calculateChannelId} from '../../store/state-utils';
import {ChannelConstants, Outcome, Participant, State} from '../../store/types';
import {AddressZero} from 'ethers/constants';
import {add} from '../../utils/math-utils';
import {simpleEthAllocation} from '../../utils/outcome';

const wallet1 = new ethers.Wallet(
  '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318'
); // 0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf
const wallet2 = new ethers.Wallet(
  '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727'
); // 0x2222E21c8019b14dA16235319D34b5Dd83E644A9
const wallet3 = new ethers.Wallet(
  '0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29'
); // 0xaaaacfD9F7b033804ee4f01e5DfB1cd586858490

const wallets = {
  [wallet1.address]: wallet1,
  [wallet2.address]: wallet2,
  [wallet3.address]: wallet3
};

const targetParticipants: Participant[] = [
  {
    destination: wallet1.address,
    signingAddress: wallet1.address,
    participantId: 'a'
  },
  {
    destination: wallet2.address,
    signingAddress: wallet2.address,
    participantId: 'b'
  }
];
const jointParticipants: Participant[] = [
  {
    destination: wallet1.address,
    signingAddress: wallet1.address,
    participantId: 'a'
  },
  {
    destination: wallet3.address,
    signingAddress: wallet3.address,
    participantId: 'hub'
  },
  {
    destination: wallet2.address,
    signingAddress: wallet2.address,
    participantId: 'b'
  }
];

jest.setTimeout(20000);
const EXPECT_TIMEOUT = process.env.CI ? 9500 : 2000;
const chainId = '0x01';
const challengeDuration = bigNumberify(10);
const appDefinition = AddressZero;

const targetChannel: ChannelConstants = {
  channelNonce: bigNumberify(0),
  chainId,
  challengeDuration,
  participants: targetParticipants,
  appDefinition
};
const targetChannelId = calculateChannelId(targetChannel);
const jointChannel: ChannelConstants = {
  channelNonce: bigNumberify(0),
  chainId,
  challengeDuration,
  participants: jointParticipants,
  appDefinition
};
const jointChannelId = calculateChannelId(jointChannel);

const amounts = [bigNumberify(2), bigNumberify(3)];
const outcome: Outcome = {
  type: 'SimpleEthAllocation',
  allocationItems: [
    {
      destination: jointParticipants[0].destination,
      amount: amounts[0]
    },
    {
      destination: jointParticipants[2].destination,
      amount: amounts[1]
    },
    {
      destination: jointParticipants[1].destination,
      amount: amounts.reduce(add)
    }
  ]
};
const state = firstState(outcome, jointChannel);
const signature = signState(state, wallet1.privateKey);

const context: Init = {targetChannelId, jointChannelId};

test('Virtual funding as A', async () => {
  const store = new MemoryStore([wallet1.privateKey]);
  const service = interpret(machine(store, context, Role.A));

  store.outboxFeed.subscribe(e => {
    e.signedStates?.forEach(state => {
      state.participants.map(p => store.pushMessage({signedStates: []}));
      store.pushMessage({
        signedStates: state.participants.map(p => ({
          ...state,
          signature: signState(state, wallets[p.signingAddress].privateKey)
        }))
      });
    });
  });

  service.start();

  await waitForExpect(
    () => expect(service.state.value).toMatchObject({setupJointChannel: 'waitForFirstJointState'}),
    EXPECT_TIMEOUT
  );

  store.pushMessage({signedStates: [{...state, signatures: [signature]}]});

  await waitForExpect(
    () => expect(service.state.value).toMatchObject({fundJointChannel: 'waitForObjective'}),
    EXPECT_TIMEOUT
  );
  store.pushMessage({
    objectives: [
      {
        type: 'FundGuarantor',
        data: {jointChannelId, ledgerId: 'foo', guarantorId: 'bar'},
        participants: [jointParticipants[2], jointParticipants[1]]
      }
    ]
  });

  await waitForExpect(() => expect(service.state.value).toEqual('success'), EXPECT_TIMEOUT);
});

test('Virtual funding as Hub', async () => {
  const store = new MemoryStore([wallet3.privateKey]);
  const service = interpret(machine(store, context, Role.Hub));

  store.outboxFeed.subscribe(e => {
    e.signedStates?.forEach(state => {
      state.participants.map(p => store.pushMessage({signedStates: []}));
      store.pushMessage({
        signedStates: state.participants.map(p => ({
          ...state,
          signature: signState(state, wallets[p.signingAddress].privateKey)
        }))
      });
    });
  });

  service.start();

  await waitForExpect(
    () => expect(service.state.value).toMatchObject({setupJointChannel: 'waitForFirstJointState'}),
    EXPECT_TIMEOUT
  );

  store.pushMessage({signedStates: [{...state, signatures: [signature]}]});

  await waitForExpect(() => expect(service.state.value).toEqual('success'), EXPECT_TIMEOUT);
});

test('multiple workflows', async () => {
  const hubStore = new MemoryStore([wallet3.privateKey]);
  const aStore = new MemoryStore([wallet1.privateKey]);
  const bStore = new MemoryStore([wallet2.privateKey]);
  const stores = [aStore, hubStore, bStore];

  const hubService = interpret(machine(hubStore, context, Role.Hub));
  const aService = interpret(machine(aStore, context, Role.A));
  const bService = interpret(machine(bStore, context, Role.B));
  const services = [aService, hubService, bService];

  const message = {signedStates: [{...state, signatures: [signature]}]};

  stores.forEach((store: Store) => {
    store.pushMessage(message);
    store.outboxFeed.subscribe(message =>
      stores.forEach(s => {
        s.pushMessage(message);
      })
    );
  });
  services.forEach(service => service.start());

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('success');
    expect(hubService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');

    const {supported} = await aStore.getEntry(jointChannelId);
    const outcome = supported?.outcome;
    const amount = bigNumberify(5);
    expect(outcome).toMatchObject(
      simpleEthAllocation(
        {destination: targetChannelId, amount},
        {destination: jointParticipants[1].destination, amount}
      )
    );
  }, EXPECT_TIMEOUT);
});

test('invalid joint state', async () => {
  const store = new MemoryStore([wallet1.privateKey]);
  const service = interpret(machine(store, context, Role.A)).start();

  const invalidState: State = {
    ...state,
    outcome: {type: 'SimpleEthAllocation', allocationItems: []}
  };

  store.pushMessage({
    signedStates: [{...invalidState, signatures: [signState(invalidState, wallet1.privateKey)]}]
  });

  await waitForExpect(() => expect(service.state.value).toEqual('failure'), EXPECT_TIMEOUT);
});
