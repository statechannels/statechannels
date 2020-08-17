import {simpleEthAllocation, BN, Uint256, State} from '@statechannels/wallet-core';
import matchers from '@pacote/jest-either';

import {protocol} from '../application';
import {alice} from '../../wallet/__test__/fixtures/participants';
import {SignState} from '../actions';

import {applicationProtocolState} from './fixtures/application-protocol-state';

expect.extend(matchers);

const outcome = simpleEthAllocation([{amount: BN.from(5), destination: alice().destination}]);
const prefundState = {outcome, turnNum: 0};
const postFundState = {outcome, turnNum: 3};
const closingState = {outcome, turnNum: 4, isFinal: true};

const runningState = {outcome, turnNum: 7};
const closingState2 = {outcome, turnNum: 8, isFinal: true};

const funded = (): Uint256 => BN.from(5);
const notFunded = (): Uint256 => BN.from(0);

const signState = (state: Partial<State>): Partial<SignState> => ({type: 'SignState', ...state});

test.each`
  supported        | latestSignedByMe | latest           | funding      | action                      | cond                                                                    | result
  ${prefundState}  | ${prefundState}  | ${prefundState}  | ${funded}    | ${signState(postFundState)} | ${'when the prefund state is supported, and the channel is funded'}     | ${'signs the postfund state'}
  ${prefundState}  | ${prefundState}  | ${prefundState}  | ${notFunded} | ${signState(postFundState)} | ${'when the prefund state is supported, and the channel is not funded'} | ${'signs the postfund state'}
  ${closingState}  | ${postFundState} | ${closingState}  | ${funded}    | ${signState(closingState)}  | ${'when the postfund state is supported, and the channel is closing'}   | ${'signs the final state'}
  ${closingState2} | ${runningState}  | ${closingState2} | ${funded}    | ${signState(closingState2)} | ${'when the postfund state is supported, and the channel is closing'}   | ${'signs the final state'}
`('$result $cond', ({supported, latest, latestSignedByMe, funding, action}) => {
  const ps = applicationProtocolState({app: {supported, latest, latestSignedByMe, funding}});
  expect(protocol(ps)).toMatchObject(action);
});

// todo: add the following test case once https://github.com/statechannels/the-graph/issues/80 is resolved
//
test.each`
  supported        | latestSignedByMe | latest           | funding   | cond
  ${undefined}     | ${prefundState}  | ${prefundState}  | ${funded} | ${'when I have signed the prefund state, but it is not supported'}
  ${undefined}     | ${undefined}     | ${undefined}     | ${funded} | ${'when there is no state'}
  ${prefundState}  | ${postFundState} | ${postFundState} | ${funded} | ${'when the prefund state is supported, and I have signed the postfund state'}
  ${postFundState} | ${postFundState} | ${postFundState} | ${funded} | ${'when the postfund state is supported'}
  ${closingState}  | ${closingState}  | ${closingState}  | ${funded} | ${'when I have signed a final state'}
`('takes no action $cond', ({supported, latest, latestSignedByMe, funding}) => {
  const ps = applicationProtocolState({app: {supported, latest, latestSignedByMe, funding}});
  expect(protocol(ps)).toBeUndefined();
});
