import {simpleEthAllocation, BN, Uint256, State} from '@statechannels/wallet-core';
import matchers from '@pacote/jest-either';
import {ethers} from 'ethers';

import {protocol} from '../open-channel';
import {alice, bob} from '../../wallet/__test__/fixtures/participants';
import {SignState, fundChannel} from '../actions';
import {channel} from '../../models/__test__/fixtures/channel';

import {applicationProtocolState} from './fixtures/protocol-state';

expect.extend(matchers);

const outcome = simpleEthAllocation([{amount: BN.from(5), destination: alice().destination}]);
const outcome2 = simpleEthAllocation([
  {amount: BN.from(5), destination: bob().destination},
  {amount: BN.from(5), destination: alice().destination},
]);
const participants = [alice(), bob()];
const prefundState = {outcome, turnNum: 0, participants};
const prefundState1 = {outcome: outcome2, turnNum: 0, participants};
const postfundState2 = {outcome, turnNum: 2, participants};
const postfundState3 = {outcome, turnNum: 3, participants};

const funded = (): Uint256 => BN.from(5);
const notFunded = (): Uint256 => BN.from(0);

const signState = (state: Partial<State>): Partial<SignState> => ({type: 'SignState', ...state});
const fundChannelAction1 = fundChannel({
  channelId: channel().channelId,
  assetHolderAddress: ethers.constants.AddressZero,
  expectedHeld: BN.from(0),
  amount: BN.from(5),
});

const fundChannelAction2 = {...fundChannelAction1, expectedHeld: BN.from(5)};

test.each`
  supported        | latestSignedByMe | latest           | funding      | action                       | cond                                                                     | result
  ${prefundState}  | ${prefundState}  | ${prefundState}  | ${funded}    | ${signState(postfundState2)} | ${'when the prefund state is supported, and the channel is funded'}      | ${'signs the postfund state'}
  ${prefundState}  | ${prefundState}  | ${prefundState}  | ${notFunded} | ${fundChannelAction1}        | ${'when the prefund state is supported, and alice is first to deposit'}  | ${'submits transaction'}
  ${prefundState1} | ${prefundState1} | ${prefundState1} | ${funded}    | ${fundChannelAction2}        | ${'when the prefund state is supported, and alice is secont to deposit'} | ${'submits transaction'}
`('$result $cond', ({supported, latest, latestSignedByMe, funding, action}) => {
  const ps = applicationProtocolState({app: {supported, latest, latestSignedByMe, funding}});
  expect(protocol(ps)).toMatchObject(action);
});

test.each`
  supported         | latestSignedByMe  | latest            | funding      | cond
  ${undefined}      | ${prefundState}   | ${prefundState}   | ${funded}    | ${'when I have signed the prefund state, but it is not supported'}
  ${undefined}      | ${undefined}      | ${undefined}      | ${funded}    | ${'when there is no state'}
  ${prefundState}   | ${postfundState2} | ${postfundState2} | ${funded}    | ${'when the prefund state is supported, and I have signed the postfund state'}
  ${prefundState1}  | ${prefundState1}  | ${prefundState1}  | ${notFunded} | ${'when the prefund state is supported, and alice is second to deposit'}
  ${postfundState2} | ${postfundState2} | ${postfundState2} | ${funded}    | ${'when the first postfund state is supported'}
`('takes no action $cond', ({supported, latest, latestSignedByMe, funding}) => {
  const ps = applicationProtocolState({app: {supported, latest, latestSignedByMe, funding}});
  expect(protocol(ps)).toBeUndefined();
});

test.each`
  supported         | latestSignedByMe  | latest            | funding   | cond
  ${postfundState3} | ${postfundState3} | ${postfundState3} | ${funded} | ${'when the last postfund state is supported'}
`('completes the objective $cond', ({supported, latest, latestSignedByMe, funding}) => {
  const ps = applicationProtocolState({app: {supported, latest, latestSignedByMe, funding}});
  expect(protocol(ps)).toMatchObject({channelId: ps.app.channelId, type: 'CompleteObjective'});
});
