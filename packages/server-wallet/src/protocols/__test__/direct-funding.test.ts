import {simpleEthAllocation, makeDestination, StateVariables, BN} from '@statechannels/wallet-core';
import matchers from '@pacote/jest-either';
import {some, none} from 'fp-ts/lib/Option';

import {protocol} from '../direct-funding';
import {alice} from '../../wallet/__test__/fixtures/signingWallets';
import {Address, Uint256} from '../../type-aliases';

import {
  directFundingProtocolState,
  withSupportedState,
} from './fixtures/direct-funding-protocol-state';

expect.extend(matchers);

it('generates an action to sign the post fund setup', async () => {
  const outcome = simpleEthAllocation([
    {amount: BN.from('0x5'), destination: makeDestination(alice().address)},
  ]);
  const prefundState: Partial<StateVariables> = {
    turnNum: 0,
    outcome,
  };

  const funding: Record<Address, Uint256> = {[outcome.assetHolderAddress]: '0x5'};
  const protocolState = directFundingProtocolState(
    withSupportedState(prefundState)({app: {funding}})
  );

  expect(await protocol(protocolState)).toMatchRight(
    some({
      type: 'SignState',
      ...prefundState,
      turnNum: 3,
    })
  );
});

it('generates no actions if the post fund setup is signed', async () => {
  const outcome = simpleEthAllocation([
    {amount: BN.from('0x5'), destination: makeDestination(alice().address)},
  ]);
  const postfundSetup: Partial<StateVariables> = {
    turnNum: 3,
    outcome,
  };

  const funding: Record<Address, Uint256> = {[outcome.assetHolderAddress]: '0x5'};
  const protocolState = directFundingProtocolState(
    withSupportedState(postfundSetup)({app: {funding}})
  );

  expect(await protocol(protocolState)).toMatchRight(none);
});

it('returns an error if there is no pre fund setup', async () => {
  const protocolState = directFundingProtocolState();
  expect(await protocol(protocolState)).toBeLeft();
});
