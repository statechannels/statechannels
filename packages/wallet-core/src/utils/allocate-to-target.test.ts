import {BN} from '../bignumber';
import {AllocationItem} from '../types';

import {
  Errors,
  allocateToTarget,
  simpleEthAllocation,
  simpleTokenAllocation,
  makeDestination
} from '.';

const zero = BN.from(0);
const one = BN.from(1);
const two = BN.from(2);
const three = BN.from(3);

const left = makeDestination('0x0000000000000000000000000000000000000001');
const right = makeDestination('0x0000000000000000000000000000000000000002');
const middle = makeDestination('0x0000000000000000000000000000000000000003');
const targetChannelId = makeDestination(
  '0x1234123412341234123412341234123412341234123412341234123412341234'
);

type Allocation = AllocationItem[];
describe('allocateToTarget with valid input', () => {
  const target1: Allocation = [
    {destination: left, amount: one},
    {destination: right, amount: one}
  ];
  const ledger1: Allocation = [...target1];
  const expected1 = [{destination: targetChannelId, amount: two}];

  const target2: Allocation = [
    {destination: left, amount: one},
    {destination: right, amount: two}
  ];
  const ledger2: Allocation = [
    {destination: left, amount: three},
    {destination: right, amount: three}
  ];
  const expected2: Allocation = [
    {destination: left, amount: two},
    {destination: right, amount: one},
    {destination: targetChannelId, amount: three}
  ];

  const target3: Allocation = [
    {destination: left, amount: one},
    {destination: right, amount: two}
  ];
  const ledger3: Allocation = [
    {destination: right, amount: three},
    {destination: left, amount: three}
  ];
  const expected3: Allocation = [
    {destination: right, amount: one},
    {destination: left, amount: two},
    {destination: targetChannelId, amount: three}
  ];

  const target4: Allocation = [
    {destination: left, amount: one},
    {destination: right, amount: two}
  ];
  const ledger4: Allocation = [
    {destination: left, amount: three},
    {destination: middle, amount: three},
    {destination: right, amount: three}
  ];
  const expected4: Allocation = [
    {destination: left, amount: two},
    {destination: middle, amount: three},
    {destination: right, amount: one},
    {destination: targetChannelId, amount: three}
  ];

  const target5: Allocation = [
    {destination: left, amount: one},
    {destination: right, amount: zero}
  ];
  const ledger5: Allocation = [{destination: left, amount: one}];
  const expected5: Allocation = [{destination: targetChannelId, amount: one}];

  it.each`
    description | deductions | ledgerAllocation | expectedAllocation
    ${'one'}    | ${target1} | ${ledger1}       | ${expected1}
    ${'two'}    | ${target2} | ${ledger2}       | ${expected2}
    ${'three'}  | ${target3} | ${ledger3}       | ${expected3}
    ${'four'}   | ${target4} | ${ledger4}       | ${expected4}
    ${'five'}   | ${target5} | ${ledger5}       | ${expected5}
  `('Test $description', ({deductions, ledgerAllocation, expectedAllocation}) => {
    expect(
      allocateToTarget(simpleEthAllocation(ledgerAllocation), deductions, targetChannelId)
    ).toMatchObject(simpleEthAllocation(expectedAllocation));

    expect(
      allocateToTarget(simpleTokenAllocation('foo', ledgerAllocation), deductions, targetChannelId)
    ).toMatchObject(simpleTokenAllocation('foo', expectedAllocation));
  });
});

describe('allocateToTarget with invalid input', () => {
  const target1: Allocation = [
    {destination: left, amount: one},
    {destination: middle, amount: one}
  ];
  const ledger1: Allocation = [
    {destination: left, amount: one},
    {destination: right, amount: one}
  ];
  const error1 = Errors.DestinationMissing;

  const target2: Allocation = [
    {destination: left, amount: three},
    {destination: right, amount: three}
  ];
  const ledger2: Allocation = [
    {destination: left, amount: one},
    {destination: right, amount: two}
  ];
  const error2 = Errors.InsufficientFunds;

  it.each`
    description | deductions | ledgerAllocation | error
    ${'one'}    | ${target1} | ${ledger1}       | ${error1}
    ${'two'}    | ${target2} | ${ledger2}       | ${error2}
  `('Test $description', ({deductions, ledgerAllocation, error}) => {
    expect(() =>
      allocateToTarget(simpleEthAllocation(ledgerAllocation), deductions, targetChannelId)
    ).toThrow(error);
  });
});
