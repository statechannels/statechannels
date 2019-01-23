import { State } from 'fmg-core';
import abi from 'web3-eth-abi';
import { ethers } from 'ethers';

type BigNumber = ethers.utils.BigNumber;

interface GameAttributes {
  consensusCounter: BigNumber;
  proposedAllocation: BigNumber[];
  proposedDestination: string[];
}

class ConsensusGame {
  static preFundSetupState(opts) {
    return new PreFundSetupState(opts);
  }
  static postFundSetupState(opts) {
    return new PostFundSetupState(opts);
  }
  static gameState(opts) {
    return new GameState(opts);
  }
  static concludeState(opts) {
    return new ConcludeState(opts);
  }

  static gameAttributes(consensusStateArgs: [BigNumber, BigNumber[], string[]]): GameAttributes {
    //
    return {
      consensusCounter: consensusStateArgs[0],
      proposedAllocation: consensusStateArgs[1],
      proposedDestination: consensusStateArgs[2],
    };
  }
}

const SolidityConsensusStateType = {
  "ConsensusStateStruct": {
    "consensusCounter": "uint256",
    "proposedAllocation": "uint256[]",
    "proposedDestination": "address[]",
  },
};

class ConsensusBaseState extends State {
  consensusCounter: number;
  proposedAllocation: number[];
  proposedDestination: string[];

  constructor({ channel, turnNum, stateCount, allocation, destination, consensusCounter, proposedAllocation, proposedDestination }) {
    super({ channel, turnNum, stateCount, allocation, destination, stateType: undefined });
    this.consensusCounter = consensusCounter;
    this.proposedAllocation = proposedAllocation;
    this.proposedDestination = proposedDestination;
    this.initialize();
  }

  // tslint:disable-next-line:no-empty
  initialize() {}

  get gameAttributes() {
    return abi.encodeParameter(SolidityConsensusStateType, [this.consensusCounter, this.proposedAllocation, this.proposedDestination]);
  }
}

class PreFundSetupState extends ConsensusBaseState {
  initialize() {
    this.stateType = State.StateType.PreFundSetup;
  }
}

class PostFundSetupState extends ConsensusBaseState {
  initialize() {
    this.stateType = State.StateType.PostFundSetup;
  }
}

class GameState extends ConsensusBaseState {
  initialize() {
    this.stateType = State.StateType.Game;
  }
}

class ConcludeState extends ConsensusBaseState {
  initialize() {
    this.stateType = State.StateType.Conclude;
  }
}

export { ConsensusGame };