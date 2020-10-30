import {simpleEthAllocation, BN, State} from '@statechannels/wallet-core';
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

const prefundState0 = {outcome, turnNum: 0, participants};
const prefundState1 = {outcome, turnNum: 1, participants};
const postfundState2 = {outcome, turnNum: 2, participants};
const postfundState3 = {outcome, turnNum: 3, participants};

const altPrefundState0 = {outcome: outcome2, turnNum: 0, participants};

const reversedPFState0 = {outcome, turnNum: 0, participants: [bob(), alice()]};
const reversedPFState1 = {outcome, turnNum: 1, participants: [bob(), alice()]};

const funded = () => ({
  amount: BN.from(5),
});
const notFunded = () => ({amount: BN.from(0)});

const signState = (state: Partial<State>): Partial<SignState> => ({type: 'SignState', ...state});
const fundChannelAction1 = fundChannel({
  channelId: channel().channelId,
  assetHolderAddress: ethers.constants.AddressZero,
  expectedHeld: BN.from(0),
  amount: BN.from(5),
});

const fundChannelAction2 = {...fundChannelAction1, expectedHeld: BN.from(5)};

test.each`
  supported           | myIndex | latestSignedByMe    | latest              | funding      | action                         | cond                                                                     | result
  ${undefined}        | ${0}    | ${undefined}        | ${prefundState1}    | ${notFunded} | ${signState(prefundState0)}    | ${'when the prefund state is not supported, and I am index 0'}           | ${'signs the prefund state'}
  ${undefined}        | ${0}    | ${undefined}        | ${reversedPFState1} | ${notFunded} | ${signState(reversedPFState0)} | ${'when the prefund state is not supported, and I am index 1'}           | ${'signs the prefund state'}
  ${prefundState0}    | ${0}    | ${prefundState0}    | ${prefundState0}    | ${funded}    | ${signState(postfundState2)}   | ${'when the prefund state is supported, and the channel is funded'}      | ${'signs the prefund state'}
  ${prefundState1}    | ${0}    | ${prefundState0}    | ${prefundState1}    | ${funded}    | ${signState(postfundState2)}   | ${'when the prefund state is supported, and the channel is funded'}      | ${'signs the postfund state'}
  ${prefundState1}    | ${1}    | ${prefundState1}    | ${prefundState1}    | ${funded}    | ${signState(postfundState3)}   | ${'when the prefund state is supported, and the channel is funded'}      | ${'signs the postfund state'}
  ${prefundState0}    | ${0}    | ${prefundState0}    | ${prefundState0}    | ${notFunded} | ${fundChannelAction1}          | ${'when the prefund state is supported, and alice is first to deposit'}  | ${'submits transaction'}
  ${altPrefundState0} | ${0}    | ${altPrefundState0} | ${altPrefundState0} | ${funded}    | ${fundChannelAction2}          | ${'when the prefund state is supported, and alice is secont to deposit'} | ${'submits transaction'}
`('$result $cond', ({supported, latest, latestSignedByMe, funding, action, myIndex}) => {
  const ps = applicationProtocolState({
    app: {supported, latest, latestSignedByMe, funding, myIndex},
  });
  expect(protocol(ps)).toMatchObject(action);
});

test.each`
  supported           | latestSignedByMe    | latest              | funding      | cond
  ${undefined}        | ${prefundState0}    | ${prefundState0}    | ${funded}    | ${'when I have signed the prefund state, but it is not supported'}
  ${undefined}        | ${undefined}        | ${undefined}        | ${funded}    | ${'when there is no state'}
  ${prefundState0}    | ${postfundState2}   | ${postfundState2}   | ${funded}    | ${'when the prefund state is supported, and I have signed the postfund state'}
  ${altPrefundState0} | ${altPrefundState0} | ${altPrefundState0} | ${notFunded} | ${'when the prefund state is supported, and alice is second to deposit'}
  ${postfundState2}   | ${postfundState2}   | ${postfundState2}   | ${funded}    | ${'when the first postfund state is supported'}
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
