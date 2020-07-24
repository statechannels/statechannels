import {simpleEthAllocation, makeDestination, BN} from '@statechannels/wallet-core';
import matchers from '@pacote/jest-either';
import {some, none} from 'fp-ts/lib/Option';

import {protocol} from '../application';
import {alice} from '../../wallet/__test__/fixtures/signingWallets';
import {Uint256} from '../../type-aliases';

import {
  directFundingProtocolState,
  withSupportedState,
} from './fixtures/application-protocol-state';

expect.extend(matchers);

const outcome = simpleEthAllocation([
  {amount: BN.from('0x5'), destination: makeDestination(alice().address)},
]);
const prefundState = {outcome, turnNum: 0};
const postFundState = {outcome, turnNum: 3};

it('generates an action to sign the post fund setup', async () => {
  const funding = (): Uint256 => '0x5';
  const protocolState = directFundingProtocolState(
    withSupportedState(prefundState)({app: {funding}})
  );

  expect(await protocol(protocolState)).toMatchRight(some({type: 'SignState', ...postFundState}));
});

it('generates no actions if the post fund setup is signed', async () => {
  const funding = (): Uint256 => '0x5';
  const protocolState = directFundingProtocolState(
    withSupportedState(postFundState)({app: {funding}})
  );

  expect(await protocol(protocolState)).toMatchRight(none);
});

it('returns an error if there is no pre fund setup', async () => {
  const protocolState = directFundingProtocolState();
  expect(await protocol(protocolState)).toBeLeft();
});
