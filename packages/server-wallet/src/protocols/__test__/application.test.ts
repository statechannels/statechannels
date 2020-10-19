import {simpleEthAllocation, BN, Uint256, State} from '@statechannels/wallet-core';
import matchers from '@pacote/jest-either';
import {ethers} from 'ethers';

import {protocol} from '../application';
import {alice, bob} from '../../wallet/__test__/fixtures/participants';
import {SignState, fundChannel} from '../actions';
import {channel} from '../../models/__test__/fixtures/channel';

import {applicationProtocolState} from './fixtures/application-protocol-state';

expect.extend(matchers);

const outcome = simpleEthAllocation([{amount: BN.from(5), destination: alice().destination}]);
const outcome2 = simpleEthAllocation([
  {amount: BN.from(5), destination: bob().destination},
  {amount: BN.from(5), destination: alice().destination},
]);
const participants = [alice(), bob()];
const prefundState = {outcome, turnNum: 0, participants};
const prefundState2 = {outcome: outcome2, turnNum: 0, participants};
const postFundState = {outcome, turnNum: 2, participants};
const closingState = {outcome, turnNum: 4, isFinal: true, participants};

const runningState = {outcome, turnNum: 7, participants: [alice(), bob()]};
const closingState2 = {outcome, turnNum: 8, isFinal: true, participants: [alice(), bob()]};

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
  supported        | latestSignedByMe | latest           | funding      | action                      | cond                                                                     | result
  ${prefundState}  | ${prefundState}  | ${prefundState}  | ${funded}    | ${signState(postFundState)} | ${'when the prefund state is supported, and the channel is funded'}      | ${'signs the postfund state'}
  ${prefundState}  | ${prefundState}  | ${prefundState}  | ${notFunded} | ${fundChannelAction1}       | ${'when the prefund state is supported, and alice is first to deposit'}  | ${'submits transaction'}
  ${prefundState2} | ${prefundState2} | ${prefundState2} | ${funded}    | ${fundChannelAction2}       | ${'when the prefund state is supported, and alice is secont to deposit'} | ${'submits transaction'}
  ${closingState}  | ${postFundState} | ${closingState}  | ${funded}    | ${signState(closingState)}  | ${'when the postfund state is supported, and the channel is closing'}    | ${'signs the final state'}
  ${closingState2} | ${runningState}  | ${closingState2} | ${funded}    | ${signState(closingState2)} | ${'when the postfund state is supported, and the channel is closing'}    | ${'signs the final state'}
`('$result $cond', ({supported, latest, latestSignedByMe, funding, action}) => {
  const ps = applicationProtocolState({app: {supported, latest, latestSignedByMe, funding}});
  expect(protocol(ps)).toMatchObject(action);
});

test.each`
  supported        | latestSignedByMe | latest           | funding      | cond
  ${undefined}     | ${prefundState}  | ${prefundState}  | ${funded}    | ${'when I have signed the prefund state, but it is not supported'}
  ${undefined}     | ${undefined}     | ${undefined}     | ${funded}    | ${'when there is no state'}
  ${prefundState}  | ${postFundState} | ${postFundState} | ${funded}    | ${'when the prefund state is supported, and I have signed the postfund state'}
  ${postFundState} | ${postFundState} | ${postFundState} | ${funded}    | ${'when the postfund state is supported'}
  ${closingState}  | ${closingState}  | ${closingState}  | ${funded}    | ${'when I have signed a final state'}
  ${prefundState2} | ${prefundState2} | ${prefundState2} | ${notFunded} | ${'when the prefund state is supported, and alice is second to deposit'}
`('takes no action $cond', ({supported, latest, latestSignedByMe, funding}) => {
  const ps = applicationProtocolState({app: {supported, latest, latestSignedByMe, funding}});
  expect(protocol(ps)).toBeUndefined();
});
