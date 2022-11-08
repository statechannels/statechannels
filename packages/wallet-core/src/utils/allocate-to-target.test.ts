import {AllocationType} from '@statechannels/exit-format';

import {BN} from '../bignumber';
import {Allocation} from '../types';
import {MOCK_ASSET_HOLDER_ADDRESS} from '../constants';

import {ethOutcome, tokenAllocation} from './outcome';

import {Errors, allocateToTarget, makeDestination} from '.';

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

type Allocations = Allocation[];
describe('allocateToTarget with valid input', () => {
  const target1: Allocations = [
    {destination: left, amount: one, metadata: '0x', allocationType: AllocationType.simple},
    {destination: right, amount: one, metadata: '0x', allocationType: AllocationType.simple}
  ];
  const ledger1: Allocations = [...target1];
  const expected1 = [{destination: targetChannelId, amount: two}];

  const target2: Allocations = [
    {destination: left, amount: one, metadata: '0x', allocationType: AllocationType.simple},
    {destination: right, amount: two, metadata: '0x', allocationType: AllocationType.simple}
  ];
  const ledger2: Allocations = [
    {destination: left, amount: three, metadata: '0x', allocationType: AllocationType.simple},
    {destination: right, amount: three, metadata: '0x', allocationType: AllocationType.simple}
  ];
  const expected2: Allocations = [
    {destination: left, amount: two, metadata: '0x', allocationType: AllocationType.simple},
    {destination: right, amount: one, metadata: '0x', allocationType: AllocationType.simple},
    {
      destination: targetChannelId,
      amount: three,
      metadata: '0x',
      allocationType: AllocationType.simple
    }
  ];

  const target3: Allocations = [
    {destination: left, amount: one, metadata: '0x', allocationType: AllocationType.simple},
    {destination: right, amount: two, metadata: '0x', allocationType: AllocationType.simple}
  ];
  const ledger3: Allocations = [
    {destination: right, amount: three, metadata: '0x', allocationType: AllocationType.simple},
    {destination: left, amount: three, metadata: '0x', allocationType: AllocationType.simple}
  ];
  const expected3: Allocations = [
    {destination: right, amount: one, metadata: '0x', allocationType: AllocationType.simple},
    {destination: left, amount: two, metadata: '0x', allocationType: AllocationType.simple},
    {
      destination: targetChannelId,
      amount: three,
      metadata: '0x',
      allocationType: AllocationType.simple
    }
  ];

  const target4: Allocations = [
    {destination: left, amount: one, metadata: '0x', allocationType: AllocationType.simple},
    {destination: right, amount: two, metadata: '0x', allocationType: AllocationType.simple}
  ];
  const ledger4: Allocations = [
    {destination: left, amount: three, metadata: '0x', allocationType: AllocationType.simple},
    {destination: middle, amount: three, metadata: '0x', allocationType: AllocationType.simple},
    {destination: right, amount: three, metadata: '0x', allocationType: AllocationType.simple}
  ];
  const expected4: Allocations = [
    {destination: left, amount: two, metadata: '0x', allocationType: AllocationType.simple},
    {destination: middle, amount: three, metadata: '0x', allocationType: AllocationType.simple},
    {destination: right, amount: one, metadata: '0x', allocationType: AllocationType.simple},
    {
      destination: targetChannelId,
      amount: three,
      metadata: '0x',
      allocationType: AllocationType.simple
    }
  ];

  const target5: Allocations = [
    {destination: left, amount: one, metadata: '0x', allocationType: AllocationType.simple},
    {destination: right, amount: zero, metadata: '0x', allocationType: AllocationType.simple}
  ];
  const ledger5: Allocations = [
    {destination: left, amount: one, metadata: '0x', allocationType: AllocationType.simple}
  ];
  const expected5: Allocations = [
    {
      destination: targetChannelId,
      amount: one,
      metadata: '0x',
      allocationType: AllocationType.simple
    }
  ];

  it.each`
    description | deductions | ledgerAllocation | expectedAllocation
    ${'one'}    | ${target1} | ${ledger1}       | ${expected1}
    ${'two'}    | ${target2} | ${ledger2}       | ${expected2}
    ${'three'}  | ${target3} | ${ledger3}       | ${expected3}
    ${'four'}   | ${target4} | ${ledger4}       | ${expected4}
    ${'five'}   | ${target5} | ${ledger5}       | ${expected5}
  `('Test $description', ({deductions, ledgerAllocation, expectedAllocation}) => {
    expect(
      allocateToTarget(ethOutcome(ledgerAllocation), deductions, targetChannelId)
    ).toMatchObject(ethOutcome(expectedAllocation));

    expect(
      allocateToTarget(
        tokenAllocation(MOCK_ASSET_HOLDER_ADDRESS, ledgerAllocation),
        deductions,
        targetChannelId
      )
    ).toMatchObject(tokenAllocation(MOCK_ASSET_HOLDER_ADDRESS, expectedAllocation));
  });
});

describe('allocateToTarget with invalid input', () => {
  const target1: Allocations = [
    {destination: left, amount: one, metadata: '0x', allocationType: AllocationType.simple},
    {destination: middle, amount: one, metadata: '0x', allocationType: AllocationType.simple}
  ];
  const ledger1: Allocations = [
    {destination: left, amount: one, metadata: '0x', allocationType: AllocationType.simple},
    {destination: right, amount: one, metadata: '0x', allocationType: AllocationType.simple}
  ];
  const error1 = Errors.DestinationMissing;

  const target2: Allocations = [
    {destination: left, amount: three, metadata: '0x', allocationType: AllocationType.simple},
    {destination: right, amount: three, metadata: '0x', allocationType: AllocationType.simple}
  ];
  const ledger2: Allocations = [
    {destination: left, amount: one, metadata: '0x', allocationType: AllocationType.simple},
    {destination: right, amount: two, metadata: '0x', allocationType: AllocationType.simple}
  ];
  const error2 = Errors.InsufficientFunds;

  it.each`
    description | deductions | ledgerAllocation | error
    ${'one'}    | ${target1} | ${ledger1}       | ${error1}
    ${'two'}    | ${target2} | ${ledger2}       | ${error2}
  `('Test $description', ({deductions, ledgerAllocation, error}) => {
    expect(() =>
      allocateToTarget(ethOutcome(ledgerAllocation), deductions, targetChannelId)
    ).toThrow(error);
  });
});
