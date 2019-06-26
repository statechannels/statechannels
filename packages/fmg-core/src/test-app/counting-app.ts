import abi from 'web3-eth-abi';
import { CommitmentType, Commitment, BaseCommitment, ethereumArgs } from '../commitment';
import { Uint256 } from '../types';

export interface AppAttributes {
  appCounter: Uint256;
}

export interface CountingBaseCommitment extends BaseCommitment {
  appCounter: Uint256;
}

export interface CountingCommitment extends CountingBaseCommitment {
  commitmentType: CommitmentType;
}

export const SolidityCountingCommitmentType = {
  CountingCommitmentStruct: {
    appCounter: 'uint256',
  },
};

export const createCommitment = {
  preFundSetup: function preFundSetupCommitment(opts: CountingBaseCommitment): CountingCommitment {
    return { ...opts, commitmentType: CommitmentType.PreFundSetup };
  },
  postFundSetup: function postFundSetupCommitment(
    opts: CountingBaseCommitment,
  ): CountingCommitment {
    return { ...opts, commitmentType: CommitmentType.PostFundSetup };
  },
  app: function appCommitment(opts: CountingBaseCommitment): CountingCommitment {
    return { ...opts, commitmentType: CommitmentType.App, commitmentCount: 0 };
  },
  conclude: function concludeCommitment(opts: CountingBaseCommitment): CountingCommitment {
    return { ...opts, commitmentType: CommitmentType.Conclude };
  },
};

export function appAttributesFromCommitment(countingAppAttributes: AppAttributes): string {
  return abi.encodeParameter(SolidityCountingCommitmentType, [countingAppAttributes.appCounter]);
}

export function args(commitment: CountingCommitment) {
  return ethereumArgs(asCoreCommitment(commitment));
}

export function asCoreCommitment(commitment: CountingCommitment): Commitment {
  const {
    channel,
    commitmentType,
    turnNum,
    allocation,
    destination,
    commitmentCount,
    appCounter,
  } = commitment;

  return {
    channel,
    commitmentType,
    turnNum,
    allocation,
    destination,
    commitmentCount,
    appAttributes: appAttributesFromCommitment({ appCounter }),
  };
}
