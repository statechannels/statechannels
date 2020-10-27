import {simpleEthAllocation, BN, State} from '@statechannels/wallet-core';
import matchers from '@pacote/jest-either';

import {protocol} from '../close-channel';
import {alice, bob} from '../../wallet/__test__/fixtures/participants';
import {SignState} from '../actions';

import {applicationProtocolState} from './fixtures/protocol-state';

expect.extend(matchers);

const outcome = simpleEthAllocation([{amount: BN.from(5), destination: alice().destination}]);

const participants = [alice(), bob()];
const postFundState = {outcome, turnNum: 3, participants};
const closingState = {outcome, turnNum: 4, isFinal: true, participants};

const runningState = {outcome, turnNum: 7, participants};
const closingState2 = {outcome, turnNum: 8, isFinal: true, participants};

const signState = (state: Partial<State>): Partial<SignState> => ({type: 'SignState', ...state});

// TODO: (Stored Objectives) write a test to confirm it signs a new isFinal state if you tell it to

test.each`
  supported        | latestSignedByMe | latest           | action                      | cond                                                                  | result
  ${closingState}  | ${postFundState} | ${closingState}  | ${signState(closingState)}  | ${'when the postfund state is supported, and the channel is closing'} | ${'signs the final state'}
  ${closingState2} | ${runningState}  | ${closingState2} | ${signState(closingState2)} | ${'when the postfund state is supported, and the channel is closing'} | ${'signs the final state'}
`('$result $cond', ({supported, latest, latestSignedByMe, action}) => {
  const ps = applicationProtocolState({app: {supported, latest, latestSignedByMe}});
  expect(protocol(ps)).toMatchObject(action);
});

test('when I have signed a final state, direct funding', () => {
  const ps = applicationProtocolState({
    app: {supported: closingState, latest: closingState, latestSignedByMe: closingState},
  });
  expect(protocol(ps)).toMatchObject({
    type: 'Withdraw',
    channelId: ps.app.channelId,
  });
});

test('when I have signed a final state, unfunded', () => {
  const ps = applicationProtocolState({
    app: {supported: closingState, latest: closingState, latestSignedByMe: closingState},
  });
  ps.app.fundingStrategy = 'Unfunded';
  expect(protocol(ps)).toMatchObject({
    type: 'CompleteObjective',
    channelId: ps.app.channelId,
  });
});
