import {Commitment, Channel, CommitmentType} from '.';
import {bigNumberify} from 'ethers/utils';

export interface PaymentCommitmentArgs {
  libraryAddress: string;
  channelNonce: number;
  asAddress: string;
  bsAddress: string;
  asBalance: string;
  bsBalance: string;
  token: string[];
  turnNum: number;
  commitmentCount: number;
}

export enum PlayerIndex {
  A = 0,
  B = 1,
}

function fromPaymentCommitmentArgs(paymentArgs: PaymentCommitmentArgs): Commitment {
  const {
    turnNum,
    asAddress,
    bsAddress,
    channelNonce,
    libraryAddress,
    asBalance,
    bsBalance,
    token,
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
    token,
    commitmentCount,
    commitmentType: CommitmentType.App,
    appAttributes: '0x0',
    turnNum,
  };
}

export function preFundSetupCommitment(paymentArgs: PaymentCommitmentArgs): Commitment {
  return {...fromPaymentCommitmentArgs(paymentArgs), commitmentType: CommitmentType.PreFundSetup};
}
export function postFundSetupCommitment(paymentArgs: PaymentCommitmentArgs): Commitment {
  return {
    ...fromPaymentCommitmentArgs(paymentArgs),
    commitmentType: CommitmentType.PostFundSetup,
  };
}
export function appCommitment(paymentArgs: PaymentCommitmentArgs): Commitment {
  return {...fromPaymentCommitmentArgs(paymentArgs), commitmentType: CommitmentType.App};
}
export function concludeCommitment(paymentArgs: PaymentCommitmentArgs): Commitment {
  return {...fromPaymentCommitmentArgs(paymentArgs), commitmentType: CommitmentType.Conclude};
}

// Transition helpers
export function initialPreFundSetup(
  libraryAddress: string,
  channelNonce: number,
  asAddress: string,
  bsAddress: string,
  asBalance: string,
  bsBalance: string,
  token,
): Commitment {
  return preFundSetupCommitment({
    libraryAddress,
    channelNonce,
    asAddress,
    bsAddress,
    asBalance,
    bsBalance,
    token,
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
export function pay(commitment: Commitment, amount: string, ourIndex: PlayerIndex): Commitment {
  const ourTurnOnExistingCommitment = commitment.turnNum % 2 === ourIndex;

  // If it was already our turn we send out a replacement commitment
  // The other player will always want to accept the replacement commitment
  // since it result in a larger allocation for them
  const turnNum = ourTurnOnExistingCommitment ? commitment.turnNum : commitment.turnNum + 1;
  const theirIndex = 1 - ourIndex;

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
    turnNum,
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
