import {simpleEthAllocation, BN, State} from '@statechannels/wallet-core';

import {protocol} from '../close-channel';
import {alice, bob} from '../../wallet/__test__/fixtures/participants';
import {SignState} from '../actions';
import {ChainServiceRequest, requestTimeout} from '../../models/chain-service-request';
import {channel} from '../../models/__test__/fixtures/channel';

import {applicationProtocolState} from './fixtures/protocol-state';

const outcome = simpleEthAllocation([{amount: BN.from(5), destination: alice().destination}]);

const participants = [alice(), bob()];
const postFundState = {outcome, turnNum: 3, participants};
const closingState = {outcome, turnNum: 4, isFinal: true, participants};

const runningState = {outcome, turnNum: 7, participants};
const closingState2 = {outcome, turnNum: 8, isFinal: true, participants};

const signState = (state: Partial<State>): Partial<SignState> => ({type: 'SignState', ...state});
const withdrawAction = {
  type: 'Withdraw',
  channelId: channel().channelId,
};
const validCSR = ChainServiceRequest.fromJson({
  channelId: 0,
  request: 'withdraw',
  timestamp: new Date(),
});

const staleCSR = ChainServiceRequest.fromJson({
  channelId: 0,
  request: 'withdraw',
  timestamp: new Date(Date.now() - requestTimeout - 1),
});

test.each`
  supported        | latestSignedByMe | latest           | chainServiceRequests | action                      | cond                                                                  | result
  ${postFundState} | ${postFundState} | ${postFundState} | ${undefined}         | ${signState(closingState)}  | ${'when the postfund state is supported, and the channel is closing'} | ${'signs the final state'}
  ${closingState}  | ${postFundState} | ${closingState}  | ${undefined}         | ${signState(closingState)}  | ${'when the closing state is supported, and the channel is closing'}  | ${'signs the final state'}
  ${closingState2} | ${runningState}  | ${closingState2} | ${undefined}         | ${signState(closingState2)} | ${'when the closing state is supported, and the channel is closing'}  | ${'signs the final state'}
  ${closingState}  | ${closingState}  | ${closingState}  | ${undefined}         | ${withdrawAction}           | ${'when the channel is closed'}                                       | ${'submits withdraw transaction'}
  ${closingState}  | ${closingState}  | ${closingState}  | ${[validCSR]}        | ${undefined}                | ${'when the channel is closed + valid chain service request'}         | ${'no action'}
  ${closingState}  | ${closingState}  | ${closingState}  | ${[staleCSR]}        | ${withdrawAction}           | ${'when the channel is closed + stale chain service request'}         | ${'sumbits a withdraw transaction'}
`('$result $cond', ({supported, latest, latestSignedByMe, chainServiceRequests, action}) => {
  const ps = applicationProtocolState({
    app: {supported, latest, latestSignedByMe, chainServiceRequests},
  });
  if (action) {
    expect(protocol(ps)).toMatchObject(action);
  } else {
    expect(protocol(ps)).toBeUndefined();
  }
});

test('when I have signed a final state, unfunded', () => {
  const ps = applicationProtocolState({
    app: {
      supported: closingState,
      latest: closingState,
      latestSignedByMe: closingState,
      directFundingStatus: 'Uncategorized',
    },
  });
  ps.app.fundingStrategy = 'Fake';
  expect(protocol(ps)).toMatchObject({
    type: 'CompleteObjective',
    channelId: ps.app.channelId,
  });
});
