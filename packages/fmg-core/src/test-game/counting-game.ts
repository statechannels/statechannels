import abi from 'web3-eth-abi';
import { StateType, State, BaseState, ethereumArgs } from '../state';
import { utils } from 'ethers';

export interface GameAttributes {
  gameCounter: utils.BigNumber;
}

export interface CountingBaseState extends BaseState {
  gameCounter: utils.BigNumber;
}

export interface CountingState extends CountingBaseState {
  stateType: StateType;
}

export const SolidityCountingStateType = {
  "CountingStateStruct": {
    "gameCounter": "uint256",
  },
};

export const createState = {
  preFundSetup: function preFundSetupState(opts: CountingBaseState): CountingState {
    return { ...opts, stateType: StateType.PreFundSetup };
  },
  postFundSetup: function postFundSetupState(opts: CountingBaseState): CountingState {
    return { ...opts, stateType: StateType.PostFundSetup };
  },
  game: function gameState(opts: CountingBaseState): CountingState {
    return { ...opts, stateType: StateType.Game, stateCount: utils.bigNumberify(0) };
  },
  conclude: function concludeState(opts: CountingBaseState): CountingState {
    return { ...opts, stateType: StateType.Conclude, };
  },
};

export function gameAttributesFromState(countingGameAttributes: GameAttributes): string {
  return abi.encodeParameter(SolidityCountingStateType, [countingGameAttributes.gameCounter]);
}

export function args(state: CountingState) {
  return ethereumArgs(asCoreState(state));
}

export function asCoreState(state: CountingState): State {
  const {
    channel,
    stateType,
    turnNum,
    allocation,
    destination,
    stateCount,
    gameCounter,
  } = state;

  return {
    channel,
    stateType,
    turnNum,
    allocation,
    destination,
    stateCount,
    gameAttributes: gameAttributesFromState({ gameCounter} ),
  };
}
