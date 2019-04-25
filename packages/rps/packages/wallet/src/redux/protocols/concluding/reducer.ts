import {
  ConcludingState as CState,
  NonTerminalState as NonTerminalCState,
  approveConcluding,
  failure,
  acknowledgeConcludingImpossible,
  waitForOpponentConclude,
  acknowledgeChannelConcluded,
  waitForDefund,
  success,
  acknowledgeChannelDoesntExist,
  acknowledgeDefundFailed,
} from './states';
import { ConcludingAction } from './actions';
import { unreachable, ourTurn } from '../../../utils/reducer-utils';
import { SharedData, getChannel } from '../../state';
import { composeConcludeCommitment } from '../../../utils/commitment-utils';
import { ChannelState } from '../../channel-store/state';
type Storage = SharedData;

export interface ReturnVal {
  state: CState;
  storage: Storage;
  sideEffects?;
}

export function concludingReducer(
  state: NonTerminalCState,
  storage: SharedData,
  action: ConcludingAction,
): ReturnVal {
  switch (action.type) {
    case 'CONCLUDING.CANCELLED':
      return concludingCancelled(state, storage);
    case 'CONCLUDE.SENT':
      return concludeSent(state, storage);
    case 'CONCLUDING.IMPOSSIBLE.ACKNOWLEDGED':
      return resignationImpossibleAcknowledged(state, storage);
    case 'CONCLUDE.RECEIVED':
      return concludeReceived(state, storage);
    case 'DEFUND.CHOSEN':
      return defundChosen(state, storage);
    case 'DEFUND.FAILED':
      return defundFailed(state, storage);
    case 'DEFUNDED':
      return defunded(state, storage);
    case 'ACKNOWLEDGED':
      return acknowledged(state, storage);
    default:
      return unreachable(action);
  }
}

export function initialize(channelId: string, processId: string, storage: Storage): ReturnVal {
  const channelState = getChannel(storage, channelId);
  if (!channelState) {
    return { state: acknowledgeChannelDoesntExist({ processId }), storage };
  }
  if (ourTurn(channelState)) {
    // if it's our turn now, we may resign
    return { state: approveConcluding({ channelId, processId }), storage };
  } else {
    return { state: acknowledgeConcludingImpossible({ channelId, processId }), storage };
  }
}

function concludingCancelled(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'ApproveConcluding') {
    return { state, storage };
  }
  return { state: failure({ reason: 'ConcludeCancelled' }), storage };
}
function resignationImpossibleAcknowledged(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'AcknowledgeConcludingImpossible') {
    return { state, storage };
  }
  return { state: failure({ reason: 'NotYourTurn' }), storage };
}

function concludeSent(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'ApproveConcluding') {
    return { state, storage };
  }

  if (storage.channelStore.activeAppChannelId) {
    const channelId = storage.channelStore.activeAppChannelId;

    const channelState = getChannel(storage, channelId) as ChannelState;

    const {
      concludeCommitment,
      commitmentSignature,
      sendCommitmentAction,
    } = composeConcludeCommitment(channelState);

    return {
      state: waitForOpponentConclude({
        ...state,
        turnNum: concludeCommitment.turnNum,
        penultimateCommitment: storage.channelStore.initializedChannels.lastCommitment,
        lastCommitment: { commitment: concludeCommitment, signature: commitmentSignature },
      }),
      sideEffects: { messageOutbox: sendCommitmentAction },
      storage,
    };
  }
  return { state: waitForOpponentConclude({ ...state }), storage };
  // TODO craft conclude commitment
  // TODO send to opponent
}

function concludeReceived(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'WaitForOpponentConclude') {
    return { state, storage };
  }
  return { state: acknowledgeChannelConcluded(state), storage };
}

function defundChosen(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'AcknowledgeChannelConcluded') {
    return { state, storage };
  }
  return { state: waitForDefund(state), storage };
}

function defundFailed(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'WaitForDefund') {
    return { state, storage };
  }
  return { state: acknowledgeDefundFailed({ ...state }), storage };
}

function defunded(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'WaitForDefund') {
    return { state, storage };
  }
  return { state: success(), storage };
}

function acknowledged(state: NonTerminalCState, storage: Storage): ReturnVal {
  switch (state.type) {
    case 'AcknowledgeChannelDoesntExist':
      return { state: failure({ reason: 'ChannelDoesntExist' }), storage };
    case 'AcknowledgeDefundFailed':
      return { state: failure({ reason: 'DefundFailed' }), storage };
    default:
      return { state, storage };
  }
}
