import { Allocation } from '@statechannels/nitro-protocol';

import { allocateToTarget, Errors } from '../calculations';

import { ethAllocationOutcome } from '..';

const left = '0x01';
const right = '0x02';
const middle = '0x03';
const targetChannelId = '0x04';

describe('allocateToTarget with valid input', () => {
  const target1: Allocation = [
    { destination: left, amount: '0x01' },
    { destination: right, amount: '0x01' },
  ];
  const ledger1: Allocation = [...target1];
  const expected1 = [{ destination: targetChannelId, amount: '0x02' }];

  const target2: Allocation = [
    { destination: left, amount: '0x01' },
    { destination: right, amount: '0x02' },
  ];
  const ledger2: Allocation = [
    { destination: left, amount: '0x03' },
    { destination: right, amount: '0x03' },
  ];
  const expected2: Allocation = [
    { destination: left, amount: '0x02' },
    { destination: right, amount: '0x01' },
    { destination: targetChannelId, amount: '0x03' },
  ];

  const target3: Allocation = [
    { destination: left, amount: '0x01' },
    { destination: right, amount: '0x02' },
  ];
  const ledger3: Allocation = [
    { destination: right, amount: '0x03' },
    { destination: left, amount: '0x03' },
  ];
  const expected3: Allocation = [
    { destination: right, amount: '0x01' },
    { destination: left, amount: '0x02' },
    { destination: targetChannelId, amount: '0x03' },
  ];

  const target4: Allocation = [
    { destination: left, amount: '0x01' },
    { destination: right, amount: '0x02' },
  ];
  const ledger4: Allocation = [
    { destination: left, amount: '0x03' },
    { destination: middle, amount: '0x03' },
    { destination: right, amount: '0x03' },
  ];
  const expected4: Allocation = [
    { destination: left, amount: '0x02' },
    { destination: middle, amount: '0x03' },
    { destination: right, amount: '0x01' },
    { destination: targetChannelId, amount: '0x03' },
  ];
  it.each`
    description | targetAllocation | ledgerAllocation | expectedAllocation
    ${'one'}    | ${target1}       | ${ledger1}       | ${expected1}
    ${'two'}    | ${target2}       | ${ledger2}       | ${expected2}
    ${'three'}  | ${target3}       | ${ledger3}       | ${expected3}
    ${'four'}   | ${target4}       | ${ledger4}       | ${expected4}
  `(
    'Test $description',
    ({ description, targetAllocation, ledgerAllocation, expectedAllocation }) => {
      expect(allocateToTarget(targetAllocation, ledgerAllocation, targetChannelId)).toMatchObject(
        ethAllocationOutcome(expectedAllocation)
      );
    }
  );
});

describe('allocateToTarget with invalid input', () => {
  const target1: Allocation = [
    { destination: left, amount: '0x01' },
    { destination: middle, amount: '0x01' },
  ];
  const ledger1: Allocation = [
    { destination: left, amount: '0x01' },
    { destination: right, amount: '0x01' },
  ];
  const error1 = Errors.DestinationMissing;

  const target2: Allocation = [
    { destination: left, amount: '0x03' },
    { destination: right, amount: '0x03' },
  ];
  const ledger2: Allocation = [
    { destination: left, amount: '0x01' },
    { destination: right, amount: '0x02' },
  ];
  const error2 = Errors.InsufficientFunds;

  it.each`
    description | targetAllocation | ledgerAllocation | error
    ${'one'}    | ${target1}       | ${ledger1}       | ${error1}
    ${'two'}    | ${target2}       | ${ledger2}       | ${error2}
  `('Test $description', ({ targetAllocation, ledgerAllocation, error }) => {
    expect(() => allocateToTarget(targetAllocation, ledgerAllocation, targetChannelId)).toThrow(
      error
    );
  });
});
