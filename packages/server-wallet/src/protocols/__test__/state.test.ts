import {BN, simpleEthAllocation} from '@statechannels/wallet-core';

import {alice, bob} from '../../engine/__test__/fixtures/participants';
import {directFundingStatus} from '../state';

const zero = BN.from(0);
const three = BN.from(3);
const five = BN.from(5);
const ten = BN.from(10);

const outcome = simpleEthAllocation([{amount: five, destination: alice().destination}]);
const participants = [alice(), bob()];

const preFundState0 = {outcome, participants, desc: 'prefund0'};
const preFundState1 = {outcome, participants, desc: 'prefund1'};
const closeState = {outcome, participants, isFinal: true, desc: 'close'};

const noFunding = () => ({amount: zero, transferredOut: []});
const hasFunding5 = () => ({amount: five, transferredOut: []});
const partTransferred = () => ({
  amount: five,
  transferredOut: [{toAddress: alice().destination, amount: three}],
});
const fullyTransferred = () => ({
  amount: five,
  transferredOut: [{toAddress: alice().destination, amount: five}],
});

describe('Only Alice funds channel', () =>
  test.each`
    supported        | fundingFn           | myParticipant      | fundingStrategy | result
    ${preFundState0} | ${noFunding}        | ${participants[0]} | ${'Direct'}     | ${'ReadyToFund'}
    ${preFundState0} | ${noFunding}        | ${participants[1]} | ${'Direct'}     | ${'Uncategorized'}
    ${preFundState1} | ${noFunding}        | ${participants[0]} | ${'Direct'}     | ${'ReadyToFund'}
    ${preFundState1} | ${noFunding}        | ${participants[1]} | ${'Direct'}     | ${'Uncategorized'}
    ${preFundState1} | ${hasFunding5}      | ${participants[0]} | ${'Direct'}     | ${'Funded'}
    ${preFundState1} | ${hasFunding5}      | ${participants[1]} | ${'Direct'}     | ${'Funded'}
    ${closeState}    | ${hasFunding5}      | ${participants[0]} | ${'Direct'}     | ${'Funded'}
    ${closeState}    | ${hasFunding5}      | ${participants[1]} | ${'Direct'}     | ${'Defunded'}
    ${closeState}    | ${partTransferred}  | ${participants[0]} | ${'Direct'}     | ${'Uncategorized'}
    ${closeState}    | ${partTransferred}  | ${participants[1]} | ${'Direct'}     | ${'Defunded'}
    ${closeState}    | ${fullyTransferred} | ${participants[0]} | ${'Direct'}     | ${'Defunded'}
    ${closeState}    | ${fullyTransferred} | ${participants[1]} | ${'Direct'}     | ${'Defunded'}
    ${preFundState1} | ${hasFunding5}      | ${participants[0]} | ${'Ledger'}     | ${'Uncategorized'}
  `(
    'Turn: $supported.desc, funding $fundingFn.name for $myParticipant.participantId results in $result',
    ({supported, fundingFn, myParticipant, fundingStrategy, result}) => {
      expect(directFundingStatus(supported, fundingFn, myParticipant, fundingStrategy)).toEqual(
        result
      );
    }
  ));

const bothFundOutcome = simpleEthAllocation([
  {amount: five, destination: alice().destination},
  {amount: five, destination: bob().destination},
]);

const bothFundPreFundState0 = {...preFundState0, outcome: bothFundOutcome};
const bothFundPreFundState1 = {...preFundState1, outcome: bothFundOutcome};
const bothFundCloseState = {...closeState, outcome: bothFundOutcome};

const hasFunding10 = () => ({amount: ten, transferredOut: []});
const transferredOutToAlice = () => ({
  amount: five,
  transferredOut: [{toAddress: alice().destination, amount: five}],
});
const transferredOutToBoth = () => ({
  amount: five,
  transferredOut: [
    {toAddress: alice().destination, amount: five},
    {toAddress: bob().destination, amount: five},
  ],
});

describe('Alice and Bob fund channel', () =>
  test.each`
    supported                | fundingFn                | myParticipant      | fundingStrategy | result
    ${bothFundPreFundState0} | ${noFunding}             | ${participants[0]} | ${'Direct'}     | ${'ReadyToFund'}
    ${bothFundPreFundState0} | ${noFunding}             | ${participants[1]} | ${'Direct'}     | ${'Uncategorized'}
    ${bothFundPreFundState1} | ${noFunding}             | ${participants[0]} | ${'Direct'}     | ${'ReadyToFund'}
    ${bothFundPreFundState1} | ${noFunding}             | ${participants[1]} | ${'Direct'}     | ${'Uncategorized'}
    ${bothFundPreFundState1} | ${hasFunding5}           | ${participants[0]} | ${'Direct'}     | ${'Uncategorized'}
    ${bothFundPreFundState1} | ${hasFunding5}           | ${participants[1]} | ${'Direct'}     | ${'ReadyToFund'}
    ${bothFundPreFundState1} | ${hasFunding10}          | ${participants[0]} | ${'Direct'}     | ${'Funded'}
    ${bothFundPreFundState1} | ${hasFunding10}          | ${participants[1]} | ${'Direct'}     | ${'Funded'}
    ${bothFundCloseState}    | ${hasFunding10}          | ${participants[0]} | ${'Direct'}     | ${'Funded'}
    ${bothFundCloseState}    | ${hasFunding10}          | ${participants[1]} | ${'Direct'}     | ${'Funded'}
    ${bothFundCloseState}    | ${transferredOutToAlice} | ${participants[0]} | ${'Direct'}     | ${'Defunded'}
    ${bothFundCloseState}    | ${transferredOutToAlice} | ${participants[1]} | ${'Direct'}     | ${'Uncategorized'}
    ${bothFundCloseState}    | ${transferredOutToBoth}  | ${participants[0]} | ${'Direct'}     | ${'Defunded'}
    ${bothFundCloseState}    | ${transferredOutToBoth}  | ${participants[1]} | ${'Direct'}     | ${'Defunded'}
  `(
    'Turn: $supported.desc, funding $fundingFn.name for $myParticipant.participantId results in $result',
    ({supported, fundingFn, myParticipant, fundingStrategy, result}) => {
      expect(directFundingStatus(supported, fundingFn, myParticipant, fundingStrategy)).toEqual(
        result
      );
    }
  ));
