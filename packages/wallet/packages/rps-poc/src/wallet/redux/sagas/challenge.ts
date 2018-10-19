import { put, take } from "redux-saga/effects";

import * as challengeActions from '../actions/challenge';
import * as displayActions from '../actions/display';
import * as externalActions from '../actions/external';
import * as blockchainActions from '../actions/blockchain';

import decode from "../../domain/decode";
import { Refute, ChallengeResponse, RespondWithMove, RespondWithAlternativeMove, RespondWithExistingMove } from "../../domain/ChallengeResponse";
import { Signature } from "src/wallet/domain/Signature";
import { ChallengeStatus } from "../../domain/ChallengeStatus";
import { ConclusionProof } from "../../domain/ConclusionProof";

export default function* challengeSaga(challenge, theirPositionString: string, theirSignatureString: string, myPositionString: string, mySignatureString: string) {
  const { expirationTime } = challenge;
  const myPosition = decode(myPositionString);
  const mySignature = new Signature(mySignatureString);
  const theirPosition = decode(theirPositionString);
  const theirSignature = new Signature(theirSignatureString);
  const challengePosition = decode(challenge.state);
  const responseOptions: ChallengeResponse[] = [];

  const userIsChallenger = myPosition.mover.toLowerCase() === challengePosition.mover.toLowerCase();

  if (theirPosition.equals(challengePosition)) {
    if (theirPosition.turnNum < myPosition.turnNum) {
      // Assume the user would respond in the same way.
      responseOptions.push(new RespondWithExistingMove({ response: myPositionString }));
    } else {
      responseOptions.push(new RespondWithMove());
    }
  }

  if (!theirPosition.equals(challengePosition)) {
    if (theirPosition.turnNum >= challengePosition.turnNum) {
      responseOptions.push(new RespondWithAlternativeMove({ theirPosition: theirPositionString, theirSignature, myPosition: myPositionString, mySignature }));
    }
    if (theirPosition.turnNum > challengePosition.turnNum) {
      responseOptions.push(new Refute({ theirPosition: theirPositionString, theirSignature }));
    }
    if (challengePosition.turnNum > myPosition.turnNum) {
      yield put(challengeActions.sendChallengePosition(challenge.state));
      responseOptions.push(new RespondWithMove());
    }
  }

  yield put(challengeActions.setChallenge(expirationTime, responseOptions, userIsChallenger ? ChallengeStatus.WaitingOnOtherPlayer : ChallengeStatus.WaitingForUserSelection));
  yield put(displayActions.showWallet());

  if (!userIsChallenger) {
    const action: challengeActions.ResponseAction = yield take(challengeActions.RESPONSE_ACTIONS);
    switch (action.type) {
      case challengeActions.RESPOND_WITH_MOVE:
        yield respondWithMove();
        break;
      case challengeActions.RESPOND_WITH_EXISTING_MOVE:
        yield respondWithExistingMove(action);
        break;
      case challengeActions.REFUTE:
        yield refute(action);
        break;
      case challengeActions.RESPOND_WITH_ALTERNATIVE_MOVE:
        yield respondWithAlternativeMove(action);
        break;
      case challengeActions.CONCLUDE:
        yield conclude(action);
        break;
      default:
        break;
    }
  }

  return true;
}

function* respondWithMove() {
  // Hide the wallet to allow the user to select a move in the app
  yield put(displayActions.hideWallet());
  yield put(displayActions.showHeader());

  const messageSentAction: externalActions.MessageSent = yield take(externalActions.MESSAGE_SENT);
  yield put(challengeActions.setChallengeStatus(ChallengeStatus.WaitingForConcludeChallenge));
  yield put(displayActions.showWallet());
  yield put(displayActions.hideHeader());
  
  const signature = new Signature(messageSentAction.signature);
  yield put(blockchainActions.respondWithMoveRequest(messageSentAction.positionData, signature));
}

function* respondWithExistingMove({ response, signature }: { response: string, signature: Signature }) {
  yield put(challengeActions.setChallengeStatus(ChallengeStatus.WaitingForConcludeChallenge));
  yield put(blockchainActions.respondWithMoveRequest(response, signature));
}

function* respondWithAlternativeMove({ alternativePosition, alternativeSignature, response, responseSignature }: { alternativePosition: string, alternativeSignature: Signature, response: string, responseSignature: Signature }) {
  yield put(challengeActions.setChallengeStatus(ChallengeStatus.WaitingForConcludeChallenge));
  yield put(blockchainActions.respondWithAlternativeMoveRequest(alternativePosition, alternativeSignature, response, responseSignature));
}

function* refute({ newerPosition, signature }: { newerPosition: string, signature: Signature }) {
  yield put(challengeActions.setChallengeStatus(ChallengeStatus.WaitingForConcludeChallenge));
  yield put(blockchainActions.refuteRequest(newerPosition, signature));
}

function* conclude({ proof }: { proof: ConclusionProof }) {
  yield put(challengeActions.setChallengeStatus(ChallengeStatus.WaitingForConcludeChallenge));
  yield put(blockchainActions.concludeRequest(proof));
}