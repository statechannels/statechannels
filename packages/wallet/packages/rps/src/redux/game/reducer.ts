import { Reducer } from 'redux';

import * as actions from './actions';
import * as states from './state';
import { randomHex } from '../../utils/randomHex';
import {
  calculateResult,
  allocationAfterResult,
  calculateAbsoluteResult,
  Player,
} from '../../core';

import { MessageState, sendMessage } from '../message-service/state';
import {
  LoginSuccess,
  LOGIN_SUCCESS,
  InitializeWalletSuccess,
  INITIALIZE_WALLET_SUCCESS,
} from '../login/actions';
import * as rpsCommitmentHelper from '../../core/rps-commitment-helper';
import { PositionType } from '../../core/rps-commitment';
import { Channel, CommitmentType } from 'fmg-core';
import { bigNumberify } from 'ethers/utils';

export interface JointState {
  gameState: states.GameState;
  messageState: MessageState;
}

const emptyJointState: JointState = {
  messageState: {},
  gameState: states.noName({ myAddress: '', libraryAddress: '' }),
};

export const gameReducer: Reducer<JointState> = (
  state = emptyJointState,
  action: actions.GameAction | LoginSuccess | InitializeWalletSuccess,
) => {
  // Filter out any actions except for game actions, and specific login/wallet actions
  // TODO: We should find a better way of handling this
  if (
    !action.type.startsWith('GAME') &&
    action.type !== actions.UPDATE_PROFILE &&
    action.type !== LOGIN_SUCCESS &&
    action.type !== INITIALIZE_WALLET_SUCCESS
  ) {
    return state;
  }
  if (action.type === actions.EXIT_TO_LOBBY && state.gameState.name !== states.StateName.NoName) {
    const myAddress = 'myAddress' in state.gameState ? state.gameState.myAddress : '';
    const myName = 'myName' in state.gameState ? state.gameState.myName : '';
    const libraryAddress =
      'libraryAddress' in state.gameState ? state.gameState.libraryAddress : '';
    const newGameState = states.lobby({ ...state.gameState, libraryAddress, myAddress, myName });
    return { gameState: newGameState, messageState: {} };
  }

  if (action.type === actions.MESSAGE_SENT) {
    const { messageState, gameState } = state;
    const { actionToRetry } = messageState;
    return { gameState, messageState: { actionToRetry } };
  }
  if (action.type === LOGIN_SUCCESS) {
    const { messageState, gameState } = state;
    const { libraryAddress } = action;
    return { gameState: { ...gameState, libraryAddress }, messageState };
  }
  if (action.type === INITIALIZE_WALLET_SUCCESS) {
    const { messageState, gameState } = state;
    const { address: myAddress } = action;
    return { gameState: { ...gameState, myAddress }, messageState };
  }
  if (action.type === actions.CHALLENGE_RESPONSE_REQUESTED) {
    if (state.gameState.name === states.StateName.PickWeapon) {
      const { messageState, gameState } = state;
      return {
        gameState: states.pickChallengeWeapon(gameState),
        messageState,
      };
    } else if (state.gameState.name === states.StateName.PlayAgain) {
      const { messageState, gameState } = state;
      return {
        gameState: states.challengePlayAgain(gameState),
        messageState,
      };
    } else {
      return state;
    }
  }

  // apply the current action to the state
  state = singleActionReducer(state, action);
  // if we have saved an action previously, see if that will apply now
  state = attemptRetry(state);
  return state;
};

function attemptRetry(state: JointState): JointState {
  const { gameState } = state;
  let { messageState } = state;

  const actionToRetry = messageState.actionToRetry;
  if (actionToRetry) {
    messageState = { ...messageState, actionToRetry: undefined };
    state = singleActionReducer({ messageState, gameState }, actionToRetry);
  }
  return state;
}

function singleActionReducer(state: JointState, action: actions.GameAction) {
  const { messageState, gameState } = state;
  switch (gameState.name) {
    case states.StateName.NoName:
      return noNameReducer(gameState, messageState, action);
    case states.StateName.Lobby:
      return lobbyReducer(gameState, messageState, action);
    case states.StateName.CreatingOpenGame:
      return creatingOpenGameReducer(gameState, messageState, action);
    case states.StateName.WaitingRoom:
      return waitingRoomReducer(gameState, messageState, action);
    case states.StateName.WaitForGameConfirmationA:
      return waitForGameConfirmationAReducer(gameState, messageState, action);
    case states.StateName.ConfirmGameB:
      return confirmGameBReducer(gameState, messageState, action);
    case states.StateName.WaitForFunding:
      return waitForFundingReducer(gameState, messageState, action);
    case states.StateName.PickWeapon:
      return pickWeaponReducer(gameState, messageState, action);
    case states.StateName.WaitForOpponentToPickWeaponA:
      return waitForOpponentToPickWeaponAReducer(gameState, messageState, action);
    case states.StateName.WaitForOpponentToPickWeaponB:
      return waitForOpponentToPickWeaponBReducer(gameState, messageState, action);
    case states.StateName.WaitForRevealB:
      return waitForRevealBReducer(gameState, messageState, action);
    case states.StateName.PlayAgain:
      return playAgainReducer(gameState, messageState, action);
    case states.StateName.WaitForRestingA:
      return waitForRestingAReducer(gameState, messageState, action);
    case states.StateName.GameOver:
      return gameOverReducer(gameState, messageState, action);
    case states.StateName.WaitForWithdrawal:
      return waitForWithdrawalReducer(gameState, messageState, action);
    case states.StateName.PickChallengeWeapon:
      return pickChallengeWeaponReducer(gameState, messageState, action);
    case states.StateName.ChallengePlayAgain:
      return challengePlayAgainReducer(gameState, messageState, action);
    default:
      throw new Error('Unreachable code');
  }
}

function noNameReducer(
  gameState: states.NoName,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  switch (action.type) {
    case actions.UPDATE_PROFILE:
      const { name, twitterHandle } = action;
      const { myAddress, libraryAddress } = gameState;

      const lobby = states.lobby({
        ...action,
        myName: name,
        myAddress,
        libraryAddress,
        twitterHandle,
      });
      return { gameState: lobby, messageState };
    default:
      return { gameState, messageState };
  }
}

function lobbyReducer(
  gameState: states.Lobby,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  switch (action.type) {
    case actions.NEW_OPEN_GAME:
      const newGameState = states.creatingOpenGame({ ...gameState });
      return { gameState: newGameState, messageState };
    case actions.JOIN_OPEN_GAME:
      const { roundBuyIn, opponentAddress, channelNonce, opponentName } = action;
      const { myName, myAddress, libraryAddress, twitterHandle } = gameState;
      const allocation = [
        bigNumberify(roundBuyIn)
          .mul(5)
          .toHexString(),
        bigNumberify(roundBuyIn)
          .mul(5)
          .toHexString(),
      ] as [string, string];

      const participants: [string, string] = [myAddress, opponentAddress];
      const turnNum = 0;
      const commitmentCount = 1;
      const channel: Channel = { channelType: libraryAddress, participants, nonce: channelNonce };
      const waitForConfirmationState = states.waitForGameConfirmationA({
        channel,
        roundBuyIn,
        opponentName,
        myName,
        allocation,
        destination: participants,
        turnNum,
        commitmentCount,
        libraryAddress,
        twitterHandle,
        myAddress,
      });
      messageState = sendMessage(
        rpsCommitmentHelper.preFundSetupA(waitForConfirmationState),
        opponentAddress,
        messageState,
      );
      return { gameState: waitForConfirmationState, messageState };
    default:
      return { gameState, messageState };
  }
}

function creatingOpenGameReducer(
  gameState: states.CreatingOpenGame,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  switch (action.type) {
    case actions.CREATE_OPEN_GAME:
      const newGameState = states.waitingRoom({
        ...gameState,
        roundBuyIn: action.roundBuyIn,
      });
      return { gameState: newGameState, messageState };
    case actions.CANCEL_OPEN_GAME:
      const newGameState1 = states.lobby(gameState);
      return { gameState: newGameState1, messageState };
    default:
      return { gameState, messageState };
  }
}

function waitingRoomReducer(
  gameState: states.WaitingRoom,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  switch (action.type) {
    case actions.INITIAL_COMMITMENT_RECEIVED:
      const { commitment, opponentName } = action;
      const { myName, twitterHandle, myAddress, libraryAddress } = gameState;

      if (
        commitment.commitmentType !== CommitmentType.PreFundSetup ||
        commitment.commitmentCount !== 0
      ) {
        return { gameState, messageState };
      }

      const newGameState = states.confirmGameB({
        ...commitment,
        roundBuyIn: commitment.stake,
        myName,
        opponentName,
        twitterHandle,
        myAddress,
        libraryAddress,
      });
      return { gameState: newGameState, messageState };
    case actions.CANCEL_OPEN_GAME:
      const newGameState1 = states.lobby(gameState);
      return { gameState: newGameState1, messageState };
    default:
      return { gameState, messageState };
  }
}

function itsMyTurn(gameState: states.PlayingState) {
  const nextTurnNum = gameState.turnNum + 1;
  return nextTurnNum % 2 === gameState.player;
}

function resignationReducer(
  gameState: states.PlayingState,
  messageState: MessageState,
): JointState {
  if (itsMyTurn(gameState)) {
    messageState = {
      ...messageState,
      walletOutbox: { type: 'CONCLUDE_REQUESTED' },
    };
  }

  return { gameState, messageState };
}

function challengeReducer(gameState: states.PlayingState, messageState: MessageState): JointState {
  messageState = { ...messageState, walletOutbox: { type: 'CHALLENGE_REQUESTED' } };

  return { gameState, messageState };
}

function waitForGameConfirmationAReducer(
  gameState: states.WaitForGameConfirmationA,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) {
    return challengeReducer(gameState, messageState);
  }
  // only action we need to handle in this state is to receiving a PreFundSetupB
  if (action.type !== actions.COMMITMENT_RECEIVED) {
    return { gameState, messageState };
  }
  if (
    action.commitment.commitmentType !== CommitmentType.PreFundSetup ||
    action.commitment.commitmentCount !== 1
  ) {
    return { gameState, messageState };
  }

  // request funding
  messageState = {
    ...messageState,
    walletOutbox: { type: 'FUNDING_REQUESTED' },
  };

  // transition to Wait for Funding
  const newGameState = states.waitForFunding({
    ...gameState,
    turnNum: gameState.turnNum + 1,
  });

  return { messageState, gameState: newGameState };
}

function confirmGameBReducer(
  gameState: states.ConfirmGameB,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) {
    return challengeReducer(gameState, messageState);
  }
  if (action.type !== actions.CONFIRM_GAME && action.type !== actions.DECLINE_GAME) {
    return { gameState, messageState };
  }

  if (action.type === actions.CONFIRM_GAME) {
    const { turnNum } = gameState;

    const newGameState = states.waitForFunding({
      ...gameState,
      turnNum: turnNum + 1,
    });
    const newCommitment = rpsCommitmentHelper.preFundSetupB(newGameState);

    const opponentAddress = states.getOpponentAddress(gameState);
    messageState = sendMessage(newCommitment, opponentAddress, messageState);
    messageState = {
      ...messageState,
      walletOutbox: { type: 'FUNDING_REQUESTED' },
    };

    return { gameState: newGameState, messageState };
  } else {
    const { myName, destination: participants, channel, player, twitterHandle } = gameState;
    // TODO: Probably should return to the waiting room instead of getting kicked back to the lobby
    const newGameState = states.lobby({
      myName,
      myAddress: participants[player],
      libraryAddress: channel.channelType,
      twitterHandle,
    });
    // TODO: Send a message to the other player that the game has been declined
    return { gameState: newGameState, messageState };
  }
}

function waitForFundingReducer(
  gameState: states.WaitForFunding,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  if (action.type === actions.FUNDING_FAILURE) {
    const { destination: participants, player } = gameState;
    const lobbyGameState = states.lobby({
      ...gameState,
      myAddress: participants[player],
      libraryAddress: gameState.channel.channelType,
    });
    return { gameState: lobbyGameState, messageState: {} };
  }

  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) {
    return challengeReducer(gameState, messageState);
  }
  if (action.type === actions.FUNDING_SUCCESS) {
    if (
      action.commitment.commitmentType !== CommitmentType.PostFundSetup ||
      action.commitment.commitmentCount !== 1
    ) {
      throw new Error('Game reducer expected PostFundSetupB on FUNDING_SUCCESS');
    }
    const postFundCommitmentB = action.commitment;
    const turnNum = postFundCommitmentB.turnNum;
    const allocation = postFundCommitmentB.allocation;
    const commitmentCount = postFundCommitmentB.commitmentCount;
    const newGameState = states.pickWeapon({
      ...gameState,
      turnNum,
      allocation,
      commitmentCount,
    });
    return { gameState: newGameState, messageState };
  }
  if (action.type === actions.COMMITMENT_RECEIVED) {
    messageState = { ...messageState, actionToRetry: action };
  }

  return { gameState, messageState };
}

function pickChallengeWeaponReducer(
  gameState: states.PickChallengeWeapon,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  const turnNum = gameState.turnNum;
  if (action.type !== actions.CHOOSE_WEAPON) {
    return { gameState, messageState };
  }
  if (gameState.player === Player.PlayerA) {
    const salt = randomHex(64);
    const asWeapon = action.weapon;

    const propose = rpsCommitmentHelper.proposeFromSalt({
      ...gameState,
      aWeapon: asWeapon,
      salt,
      turnNum: turnNum + 1,
    });

    const newGameStateA = states.waitForOpponentToPickWeaponA({
      ...gameState,
      ...propose,
      salt,
      myWeapon: asWeapon,
    });

    return {
      gameState: newGameStateA,
      messageState: {
        walletOutbox: { type: 'RESPOND_TO_CHALLENGE', data: propose },
      },
    };
  } else {
    // We received a challenge so we need to take the commitment that the opponent sent us
    // This will be on the actionToRetry that we haven't handled yet
    if (messageState.actionToRetry) {
      const opponentCommitment = messageState.actionToRetry.commitment;

      if (opponentCommitment.positionType !== PositionType.Proposed) {
        return { gameState, messageState };
      }
      const { preCommit } = opponentCommitment;
      const { allocation: allocation, roundBuyIn } = gameState;
      const aBal = bigNumberify(allocation[0])
        .sub(bigNumberify(roundBuyIn))
        .toHexString();
      const bBal = bigNumberify(allocation[1])
        .add(bigNumberify(roundBuyIn))
        .toHexString();
      const newAllocation = [aBal, bBal] as [string, string];

      const newGameStateB = states.waitForRevealB({
        ...gameState,
        preCommit,
        myWeapon: action.weapon,
        player: Player.PlayerB,
      });
      const challengeCommitment = rpsCommitmentHelper.accept({
        ...gameState,
        preCommit,
        allocation: newAllocation,
        bWeapon: newGameStateB.myWeapon,
        turnNum: turnNum + 2,
      });

      return {
        gameState: newGameStateB,
        messageState: { walletOutbox: { type: 'RESPOND_TO_CHALLENGE', data: challengeCommitment } },
      };
    }
  }

  return { gameState, messageState };
}
function pickWeaponReducer(
  gameState: states.PickWeapon,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) {
    return challengeReducer(gameState, messageState);
  }
  const turnNum = gameState.turnNum;

  if (gameState.player === Player.PlayerA) {
    if (action.type !== actions.CHOOSE_WEAPON) {
      return { gameState, messageState };
    }
    const salt = randomHex(64);
    const asWeapon = action.weapon;

    const propose = rpsCommitmentHelper.proposeFromSalt({
      ...gameState,
      aWeapon: asWeapon,
      salt,
      commitmentCount: 0, // we are transitioning from a consensus game, so need to reset this
      turnNum: turnNum + 1,
    });
    const newGameStateA = states.waitForOpponentToPickWeaponA({
      ...gameState,
      ...propose,
      salt,
      myWeapon: asWeapon,
    });

    const opponentAddress = states.getOpponentAddress(gameState);
    messageState = sendMessage(propose, opponentAddress, messageState);

    return { gameState: newGameStateA, messageState };
  } else {
    if (
      action.type === actions.COMMITMENT_RECEIVED &&
      action.commitment.positionType === PositionType.Proposed
    ) {
      messageState = { ...messageState, actionToRetry: action };
      return { gameState, messageState };
    } else if (action.type === actions.CHOOSE_WEAPON) {
      const newGameStateB = states.waitForOpponentToPickWeaponB({
        ...gameState,
        myWeapon: action.weapon,
      });

      return { gameState: newGameStateB, messageState };
    }
  }

  return { gameState, messageState };
}

function insufficientFunds(allocation: string[], roundBuyIn: string): boolean {
  const aBal = bigNumberify(allocation[0]);
  const bBal = bigNumberify(allocation[1]);
  const buyIn = bigNumberify(roundBuyIn);

  return aBal.lt(buyIn) || bBal.lt(buyIn);
}

function waitForOpponentToPickWeaponAReducer(
  gameState: states.WaitForOpponentToPickWeaponA,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) {
    return challengeReducer(gameState, messageState);
  }
  if (action.type !== actions.COMMITMENT_RECEIVED) {
    return { gameState, messageState };
  }

  const { roundBuyIn, myWeapon, salt } = gameState;
  const { commitment: theirCommitment } = action;

  if (theirCommitment.positionType !== PositionType.Accepted) {
    return { gameState, messageState };
  }

  const { bWeapon: theirWeapon, allocation, turnNum } = theirCommitment;
  const result = calculateResult(myWeapon, theirWeapon);
  const absoluteResult = calculateAbsoluteResult(myWeapon, theirWeapon);
  const bnRoundBuyIn = bigNumberify(roundBuyIn);
  const bnAllocation = allocation.map(bigNumberify);
  const newAllocation = allocationAfterResult(absoluteResult, bnRoundBuyIn, bnAllocation).map(
    item => item.toHexString(),
  );

  const newProperties = {
    myWeapon,
    theirWeapon,
    result,
    allocation: newAllocation,
    turnNum: turnNum + 1,
  };

  let newGameState;
  if (insufficientFunds(newAllocation, roundBuyIn)) {
    newGameState = states.gameOver({
      ...gameState,
      ...newProperties,
      messageState: { walletOutbox: {} },
    });
  } else {
    newGameState = states.playAgain({ ...gameState, ...newProperties });
  }

  const reveal = rpsCommitmentHelper.reveal({
    ...newGameState,
    aWeapon: myWeapon,
    bWeapon: theirWeapon,
    salt,
  });
  const opponentAddress = states.getOpponentAddress(gameState);
  messageState = sendMessage(reveal, opponentAddress, messageState);

  return { gameState: newGameState, messageState };
}

function waitForOpponentToPickWeaponBReducer(
  gameState: states.WaitForOpponentToPickWeaponB,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) {
    return challengeReducer(gameState, messageState);
  }
  if (action.type !== actions.COMMITMENT_RECEIVED) {
    return { gameState, messageState };
  }

  const commitment = action.commitment;
  if (commitment.positionType !== PositionType.Proposed) {
    return { gameState, messageState };
  }

  const preCommit = commitment.preCommit;
  const { allocation: allocation, turnNum, roundBuyIn } = gameState;
  const aBal = bigNumberify(allocation[0])
    .sub(bigNumberify(roundBuyIn))
    .toHexString();
  const bBal = bigNumberify(allocation[1])
    .add(bigNumberify(roundBuyIn))
    .toHexString();
  const newAllocation = [aBal, bBal] as [string, string];

  const newGameState = states.waitForRevealB({
    ...gameState,
    allocation: newAllocation,
    preCommit,
    turnNum: turnNum + 2,
  });

  const newCommitment = rpsCommitmentHelper.accept({
    ...newGameState,
    bWeapon: newGameState.myWeapon,
    commitmentCount: 0, // we are transitioning from a consensus game, so need to reset this
  });

  const opponentAddress = states.getOpponentAddress(gameState);
  messageState = sendMessage(newCommitment, opponentAddress, messageState);

  return { gameState: newGameState, messageState };
}

function waitForRevealBReducer(
  gameState: states.WaitForRevealB,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) {
    return challengeReducer(gameState, messageState);
  }
  if (action.type !== actions.COMMITMENT_RECEIVED) {
    return { gameState, messageState };
  }

  if (action.commitment.positionType !== PositionType.Reveal) {
    return { gameState, messageState };
  }
  const commitment = action.commitment;
  const theirWeapon = commitment.aWeapon;
  const allocation = commitment.allocation; // wallet will catch if they updated wrong
  const turnNum = commitment.turnNum;

  const myWeapon = gameState.myWeapon;
  const roundBuyIn = gameState.roundBuyIn;

  const result = calculateResult(myWeapon, theirWeapon);
  const newProperties = { theirWeapon, result, allocation, turnNum };
  if (insufficientFunds(allocation, roundBuyIn)) {
    const newGameState1 = states.gameOver({
      ...gameState,
      ...newProperties,
      turnNum,
    });

    return { gameState: newGameState1, messageState };
  } else {
    const newGameState2 = states.playAgain({ ...gameState, ...newProperties });

    return { gameState: newGameState2, messageState };
  }
}

function challengePlayAgainReducer(
  gameState: states.ChallengePlayAgain,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  switch (action.type) {
    // case actions.RESIGN: // handled globally
    // case actions.OPPONENT_RESIGNED: // handled globally
    case actions.PLAY_AGAIN:
      if (gameState.player === Player.PlayerA) {
        // transition to WaitForResting
        const newGameState = states.waitForRestingA(gameState);

        return { gameState: newGameState, messageState };
      } else {
        // transition to PickWeapon
        const { turnNum } = gameState;
        const newGameState1 = states.pickWeapon({
          ...gameState,
          turnNum: turnNum + 1,
        });

        const resting = rpsCommitmentHelper.resting(newGameState1);

        messageState = { walletOutbox: { type: 'RESPOND_TO_CHALLENGE', data: resting } };

        return { gameState: newGameState1, messageState };
      }
  }
  return { gameState, messageState };
}

function playAgainReducer(
  gameState: states.PlayAgain,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) {
    return challengeReducer(gameState, messageState);
  }

  switch (action.type) {
    // case actions.RESIGN: // handled globally
    // case actions.OPPONENT_RESIGNED: // handled globally
    case actions.PLAY_AGAIN:
      if (gameState.player === Player.PlayerA) {
        // transition to WaitForResting
        const newGameState = states.waitForRestingA(gameState);

        return { gameState: newGameState, messageState };
      } else {
        // transition to PickWeapon
        const { turnNum } = gameState;
        const newGameState1 = states.pickWeapon({
          ...gameState,
          turnNum: turnNum + 1,
        });

        const resting = rpsCommitmentHelper.resting(newGameState1);

        // send Resting
        const opponentAddress = states.getOpponentAddress(gameState);
        messageState = sendMessage(resting, opponentAddress, messageState);

        return { gameState: newGameState1, messageState };
      }

    case actions.COMMITMENT_RECEIVED:
      const commitment = action.commitment;
      if (commitment.positionType !== PositionType.Resting) {
        return { gameState, messageState };
      }

      messageState = { ...messageState, actionToRetry: action };
      return { gameState, messageState };

    default:
      return { gameState, messageState };
  }
}

function waitForRestingAReducer(
  gameState: states.WaitForRestingA,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  if (action.type === actions.RESIGN) {
    return resignationReducer(gameState, messageState);
  }
  if (action.type === actions.CREATE_CHALLENGE) {
    return challengeReducer(gameState, messageState);
  }
  if (action.type !== actions.COMMITMENT_RECEIVED) {
    return { gameState, messageState };
  }

  const commitment = action.commitment;
  if (commitment.positionType !== PositionType.Resting) {
    return { gameState, messageState };
  }

  const { turnNum } = gameState;

  const newGameState = states.pickWeapon({ ...gameState, turnNum: turnNum + 1 });

  return { gameState: newGameState, messageState };
}

function gameOverReducer(
  gameState: states.GameOver,
  messageState: MessageState,
  action: actions.GameAction,
): JointState {
  if (action.type !== actions.RESIGN) {
    return { gameState, messageState };
  }

  const newGameState = states.waitForWithdrawal(gameState);
  messageState = { ...messageState, walletOutbox: { type: 'CONCLUDE_REQUESTED' } };

  return { gameState: newGameState, messageState };
}

function waitForWithdrawalReducer(
  gameState: states.WaitForWithdrawal,
  messageState: MessageState,
  action: actions.GameAction,
) {
  if (action.type !== actions.RESIGN) {
    return { gameState, messageState };
  }
  const { myName, channel, twitterHandle } = gameState;
  const myAddress = gameState.destination[gameState.player];
  const newGameState = states.lobby({
    myName,
    myAddress,
    libraryAddress: channel.channelType,
    twitterHandle,
  });
  return { gameState: newGameState, messageState: {} };
}
