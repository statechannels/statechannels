import abi from 'web3-eth-abi';
import { CommitmentType, Commitment, BaseCommitment, ethereumArgs } from '../Commitment';
import { utils } from 'ethers';

export interface GameAttributes {
  gameCounter: utils.BigNumber;
}

export interface CountingBaseCommitment extends BaseCommitment {
  gameCounter: utils.BigNumber;
}

export interface CountingCommitment extends CountingBaseCommitment {
  commitmentType: CommitmentType;
}

export const SolidityCountingCommitmentType = {
  "CountingCommitmentStruct": {
    "gameCounter": "uint256",
  },
};

export const createCommitment = {
  preFundSetup: function preFundSetupCommitment(opts: CountingBaseCommitment): CountingCommitment {
    return { ...opts, commitmentType: CommitmentType.PreFundSetup };
  },
  postFundSetup: function postFundSetupCommitment(opts: CountingBaseCommitment): CountingCommitment {
    return { ...opts, commitmentType: CommitmentType.PostFundSetup };
  },
  game: function gameCommitment(opts: CountingBaseCommitment): CountingCommitment {
    return { ...opts, commitmentType: CommitmentType.Game, commitmentCount: utils.bigNumberify(0) };
  },
  conclude: function concludeCommitment(opts: CountingBaseCommitment): CountingCommitment {
    return { ...opts, commitmentType: CommitmentType.Conclude, };
  },
};

export function gameAttributesFromCommitment(countingGameAttributes: GameAttributes): string {
  return abi.encodeParameter(SolidityCountingCommitmentType, [countingGameAttributes.gameCounter]);
}

export function args(Commitment: CountingCommitment) {
  return ethereumArgs(asCoreCommitment(Commitment));
}

export function asCoreCommitment(Commitment: CountingCommitment): Commitment {
  const {
    channel,
    commitmentType,
    turnNum,
    allocation,
    destination,
    commitmentCount,
    gameCounter,
  } = Commitment;

  return {
    channel,
    commitmentType,
    turnNum,
    allocation,
    destination,
    commitmentCount,
    gameAttributes: gameAttributesFromCommitment({ gameCounter} ),
  };
}
