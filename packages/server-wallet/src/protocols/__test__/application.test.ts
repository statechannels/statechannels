import {simpleEthAllocation, BN, Uint256} from '@statechannels/wallet-core';
import matchers from '@pacote/jest-either';
import {some, none} from 'fp-ts/lib/Option';

import {protocol} from '../application';
import {alice} from '../../wallet/__test__/fixtures/participants';

import {applicationProtocolState, withSupportedState} from './fixtures/application-protocol-state';

expect.extend(matchers);

const outcome = simpleEthAllocation([{amount: BN.from(5), destination: alice().destination}]);
const prefundState = {outcome, turnNum: 0};
const postFundState = {outcome, turnNum: 3};

it('generates an action to sign the post fund setup', async () => {
  const funding = (): Uint256 => BN.from(5);
  const protocolState = applicationProtocolState(
    withSupportedState(prefundState)({app: {funding}})
  );

  expect(await protocol(protocolState)).toMatchRight(some({type: 'SignState', ...postFundState}));
});

it('generates no actions if the post fund setup is signed', async () => {
  const funding = (): Uint256 => BN.from(5);
  const protocolState = applicationProtocolState(
    withSupportedState(postFundState)({app: {funding}})
  );

  expect(await protocol(protocolState)).toMatchRight(none);
});

// TODO: Figure out what to with this
it.skip('returns an error if there is no pre fund setup', async () => {
  const protocolState = applicationProtocolState();
  expect(await protocol(protocolState)).toBeLeft();
});
