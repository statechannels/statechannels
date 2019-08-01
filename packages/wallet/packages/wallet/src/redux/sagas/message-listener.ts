import { take, put, select } from 'redux-saga/effects';
import * as incoming from 'magmo-wallet-client/lib/wallet-instructions';

import * as actions from '../actions';
import { eventChannel } from 'redux-saga';
import * as application from '../protocols/application/reducer';
import { isRelayableAction } from '../../communication';
import { responseProvided } from '../protocols/dispute/responder/actions';
import { getChannelId, Commitment, SignedCommitment } from '../../domain';
import * as selectors from '../selectors';
import * as contractUtils from '../../utils/contract-utils';
import { concluded, challengeRequested } from '../protocols/application/actions';

import { appAttributesFromBytes } from 'fmg-nitro-adjudicator/lib/consensus-app';
export function* messageListener() {
  const postMessageEventChannel = eventChannel(emitter => {
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.data && event.data.type && event.data.type.indexOf('WALLET') > -1) {
        emitter(event);
      }
    });
    return () => {
      /* End channel here*/
    };
  });
  while (true) {
    const messageEvent = yield take(postMessageEventChannel);
    const action = messageEvent.data;
    switch (messageEvent.data.type) {
      // Events that need a new process

      case incoming.CONCLUDE_CHANNEL_REQUEST:
        yield put(actions.protocol.concludeRequested({ channelId: action.channelId }));
        break;
      case incoming.CREATE_CHALLENGE_REQUEST:
        yield put(
          challengeRequested({
            processId: application.APPLICATION_PROCESS_ID, // TODO allow for multiple application Ids
            commitment: action.commitment,
            channelId: action.channelId,
          }),
        );
        break;
      case incoming.FUNDING_REQUEST:
        yield put(
          actions.protocol.fundingRequested({
            channelId: action.channelId,
            playerIndex: action.playerIndex,
          }),
        );
        break;

      // Events that do not need a new process
      case incoming.INITIALIZE_REQUEST:
        yield put(actions.loggedIn({ uid: action.userId }));
        break;
      case incoming.SIGN_COMMITMENT_REQUEST:
        if (action.commitment.turnNum === 0) {
          yield put(
            actions.protocol.initializeChannel({ channelId: getChannelId(action.commitment) }),
          );
        }
        yield validateAgainstLatestCommitment(action.commitment);

        yield put(
          actions.application.ownCommitmentReceived({
            processId: application.APPLICATION_PROCESS_ID,
            commitment: action.commitment,
          }),
        );
        break;
      case incoming.VALIDATE_COMMITMENT_REQUEST:
        if (action.commitment.turnNum === 0) {
          yield put(
            actions.protocol.initializeChannel({ channelId: getChannelId(action.commitment) }),
          );
        }
        yield validateAgainstLatestCommitment(action.commitment);

        yield put(
          actions.application.opponentCommitmentReceived({
            processId: application.APPLICATION_PROCESS_ID,
            commitment: action.commitment,
            signature: action.signature,
          }),
        );
        break;
      case incoming.RESPOND_TO_CHALLENGE:
        // TODO: This probably should be in a function
        const processId = application.APPLICATION_PROCESS_ID;
        yield put(responseProvided({ processId, commitment: action.commitment }));
        break;
      case incoming.RECEIVE_MESSAGE:
        const messageAction = handleIncomingMessage(action);
        if (messageAction.type === 'WALLET.COMMON.COMMITMENT_RECEIVED') {
          yield validateAgainstLatestCommitment(messageAction.signedCommitment.commitment);
        }
        if (messageAction.type === 'WALLET.COMMON.COMMITMENTS_RECEIVED') {
          yield validateTransitionForCommitments(messageAction.signedCommitments);
        }

        yield put(messageAction);
        if (messageAction.type === 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED') {
          yield put(concluded({ processId: application.APPLICATION_PROCESS_ID }));
        }
        break;
      default:
    }
  }
}

function* validateTransitionForCommitments(signedCommitments: SignedCommitment[]) {
  const channelId = getChannelId(signedCommitments[0].commitment);

  const storedCommitmentExists = yield select(selectors.doesACommitmentExistForChannel, channelId);
  if (storedCommitmentExists) {
    const latestStoredCommitment: Commitment = yield select(
      selectors.getLastCommitmentForChannel,
      channelId,
    );
    const newCommitments = signedCommitments.filter(
      signedCommitment => signedCommitment.commitment.turnNum > latestStoredCommitment.turnNum,
    );
    if (newCommitments.length > 0) {
      let fromCommitment = latestStoredCommitment;
      let toCommitment = newCommitments[0].commitment;
      yield validateTransition(fromCommitment, toCommitment);

      for (let i = 1; i < signedCommitments.length; i++) {
        fromCommitment = signedCommitments[i - 1].commitment;
        toCommitment = signedCommitments[i].commitment;
        yield validateTransition(fromCommitment, toCommitment);
      }
    }
  }
}
function* validateAgainstLatestCommitment(incomingCommitment: Commitment) {
  // If we're receiving the first commitment there's nothing stored to validate against
  if (incomingCommitment.turnNum > 0) {
    const channelId = getChannelId(incomingCommitment);
    const fromCommitment: Commitment = yield select(
      selectors.getLastCommitmentForChannel,
      channelId,
    );
    yield validateTransition(fromCommitment, incomingCommitment);
  }
}

function* validateTransition(fromCommitment: Commitment, toCommitment: Commitment) {
  const validTransition = yield contractUtils.validateTransition(fromCommitment, toCommitment);
  if (!validTransition) {
    const fromAppAttributes = appAttributesFromBytes(fromCommitment.appAttributes);
    const toAppAttributes = appAttributesFromBytes(toCommitment.appAttributes);
    throw new Error(
      `Invalid transition. From Commitment: ${JSON.stringify(
        {
          ...fromCommitment,
          appAttributes: fromAppAttributes,
        },
        null,
        1,
      )} To Commitment: ${JSON.stringify(
        {
          ...toCommitment,
          appAttributes: toAppAttributes,
        },
        null,
        1,
      )}`,
    );
  }
}

function handleIncomingMessage(action: incoming.ReceiveMessage) {
  const data = action.messagePayload;

  if ('type' in data && isRelayableAction(data)) {
    return data;
  } else {
    throw new Error('Invalid action');
  }
}
