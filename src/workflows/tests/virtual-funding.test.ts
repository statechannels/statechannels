import {getChannelId, Channel, signState} from '@statechannels/nitro-protocol';

import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';

import {Init, machine, Role} from '../virtualFunding';

import {MemoryStore} from '../../store/memory-store';
import {ethers} from 'ethers';
import {joinSignature} from 'ethers/utils';
import _ from 'lodash';
import {toNitroState} from '../../store/state-utils';

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

jest.setTimeout(10000);
const EXPECT_TIMEOUT = process.env.CI ? 9500 : 2000;
test('Virtual funding as A', async () => {
  const channel: Channel = {
    participants: [wallet1.address, wallet2.address],
    chainId: '0x1',
    channelNonce: '0x11'
  };
  const targetChannelId = getChannelId(channel);
  const context: Init = {targetChannelId, role: Role.A, jointChannelId: 'TODO'};

  const store = new MemoryStore([wallet1.privateKey]);
  const service = interpret(machine(store, context, Role.A));

  store.outboxFeed.subscribe(e => {
    e.signedStates?.forEach(state => {
      state.participants.map(p => store.pushMessage({signedStates: []}));
      store.pushMessage({
        signedStates: state.participants.map(p => ({
          ...state,
          signature: joinSignature(
            signState(toNitroState(state), wallets[p.signingAddress].privateKey).signature
          )
        }))
      });
    });
  });

  service.onTransition(state => {
    if (_.isEqual(state.value, {fundJointChannel: 'waitForObjective'})) {
      store.pushMessage({
        objectives: [] // TODO
      });
    }
  });

  service.start();

  await waitForExpect(
    () => expect(service.state.value).toEqual('setupJointChannel'),
    EXPECT_TIMEOUT
  );

  await waitForExpect(() => expect(service.state.value).toEqual('success'), EXPECT_TIMEOUT);
});
