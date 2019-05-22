import { Commitment, Channel, CommitmentType } from 'fmg-core';
import { bigNumberify } from 'ethers/utils';

export interface PaymentCommitmentArgs {
  libraryAddress: string;
  channelNonce: number;
  asAddress: string;
  bsAddress: string;
  asBalance: string;
  bsBalance: string;
  turnNum: number;
  commitmentCount: number;
}
function fromPaymentCommitmentArgs(paymentArgs: PaymentCommitmentArgs) {
  const {
    turnNum,
    asAddress,
    bsAddress,
    channelNonce,
    libraryAddress,
    asBalance,
    bsBalance,
    commitmentCount,
  } = paymentArgs;

  const channel: Channel = {
    channelType: libraryAddress,
    nonce: channelNonce,
    participants: [asAddress, bsAddress],
  };
  return {
    channel,
    allocation: [asBalance, bsBalance],
    destination: [asAddress, bsAddress],
    commitmentCount,
    commitmentType: CommitmentType.App,
    appAttributes: '0x0',
    turnNum,
  };
}

export function preFundSetupCommitment(paymentArgs: PaymentCommitmentArgs): Commitment {
  return { ...fromPaymentCommitmentArgs(paymentArgs), commitmentType: CommitmentType.PreFundSetup };
}
export function postFundSetupCommitment(paymentArgs: PaymentCommitmentArgs): Commitment {
  return {
    ...fromPaymentCommitmentArgs(paymentArgs),
    commitmentType: CommitmentType.PostFundSetup,
  };
}
export function appCommitment(paymentArgs: PaymentCommitmentArgs): Commitment {
  return { ...fromPaymentCommitmentArgs(paymentArgs), commitmentType: CommitmentType.App };
}
export function concludeCommitment(paymentArgs: PaymentCommitmentArgs): Commitment {
  return { ...fromPaymentCommitmentArgs(paymentArgs), commitmentType: CommitmentType.Conclude };
}

// Transition helpers
export function initialPreFundSetup(
  libraryAddress: string,
  channelNonce: number,
  asAddress: string,
  bsAddress: string,
  asBalance: string,
  bsBalance: string,
): Commitment {
  return preFundSetupCommitment({
    libraryAddress,
    channelNonce,
    asAddress,
    bsAddress,
    asBalance,
    bsBalance,
    turnNum: 0,
    commitmentCount: 0,
  });
}

export function nextPreFundSetup(commitment: Commitment): Commitment {
  return {
    ...commitment,
    commitmentCount: commitment.commitmentCount + 1,
    turnNum: commitment.turnNum + 1,
  };
}
export function postFundSetup(commitment: Commitment): Commitment {
  // If we are switching from a preFundSetup to a postFundSetup we reset the commitmentCount
  const commitmentCount =
    commitment.commitmentType === CommitmentType.PreFundSetup ? 0 : commitment.commitmentCount + 1;
  return {
    ...commitment,
    commitmentType: CommitmentType.PostFundSetup,
    turnNum: commitment.turnNum + 1,
    commitmentCount,
  };
}
export function pay(commitment: Commitment, amount: string): Commitment {
  const theirIndex = commitment.turnNum % 2;
  const ourIndex = 1 - theirIndex;
  const ourAllocation = commitment.allocation[ourIndex];
  const theirAllocation = commitment.allocation[theirIndex];

  const ourUpdatedAllocation = bigNumberify(ourAllocation)
    .sub(amount)
    .toHexString();
  const theirUpdatedAllocation = bigNumberify(theirAllocation)
    .add(amount)
    .toHexString();

  const updatedAllocation = [...commitment.allocation];
  updatedAllocation[ourIndex] = ourUpdatedAllocation;
  updatedAllocation[theirIndex] = theirUpdatedAllocation;

  return {
    ...commitment,
    commitmentType: CommitmentType.App,
    turnNum: commitment.turnNum + 1,
    allocation: updatedAllocation,
    commitmentCount: 0,
  };
}

export function pass(commitment: Commitment): Commitment {
  return {
    ...commitment,
    commitmentType: CommitmentType.App,
    turnNum: commitment.turnNum + 1,
    commitmentCount: 0,
  };
}

export function conclude(commitment: Commitment): Commitment {
  const commitmentCount =
    commitment.commitmentType !== CommitmentType.Conclude ? 0 : commitment.commitmentCount + 1;

  return {
    ...commitment,
    commitmentType: CommitmentType.Conclude,
    turnNum: commitment.turnNum + 1,
    commitmentCount,
  };
}
