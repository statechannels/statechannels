import {unreachable} from '@statechannels/wallet';
import {
  SignedStatesReceived,
  StrategyProposed,
  sendStatesReceived,
  sendStrategyApproved
} from '@statechannels/wallet/lib/src/communication';
import {HUB_ADDRESS} from '../../constants';
import {errors} from '../../wallet';
import {getCurrentState} from '../../wallet/db/queries/getCurrentState';
import {getProcess} from '../../wallet/db/queries/walletProcess';
import {updateLedgerChannel} from '../../wallet/services';

export async function handleOngoingProcessAction(
  action: StrategyProposed | SignedStatesReceived
): Promise<communication.RelayActionWithMessage[]> {
  switch (action.type) {
    case 'WALLET.COMMON.SIGNED_STATES_RECEIVED':
      return handleSignedStatesReceived(action);
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED':
      return handleStrategyProposed(action);
    default:
      return unreachable(action);
  }
}

async function handleStrategyProposed(action: StrategyProposed) {
  const {processId, strategy} = action;
  const process = await getProcess(processId);
  if (!process) {
    throw errors.processMissing(processId);
  }

  const {theirAddress} = process;
  return [
    communication.relayActionWithMessage({
      toParticipantId: theirAddress,
      fromParticipantId: 'hub',
      actionToRelay: communication.strategyApproved({processId, strategy})
    })
  ];
}

async function handleSignedStatesReceived(action: SignedStatesReceived) {
  {
    const {processId} = action;
    const walletProcess = await getProcess(processId);
    if (!walletProcess) {
      throw errors.processMissing(processId);
    }

    const stateRound = action.signedStates;

    // For the time being, just assume a two-party channel and proceed as normal.
    const {state: lastState} = stateRound.slice(-1)[0];

    const participants = lastState.channel.participants;
    const ourIndex = participants.indexOf(HUB_ADDRESS);

    const currentState = await getCurrentState(lastState);
    const {state, signature} = await updateLedgerChannel(
      stateRound,
      currentState && currentState.asStateObject()
    );

    return participants
      .filter((_, idx) => idx !== ourIndex)
      .map(p =>
        communication.relayActionWithMessage({
          toParticipantId: p,
          fromParticipantId: 'hub',
          actionToRelay: communication.signedStatesReceived({
            processId,
            signedStates: [
              ...action.signedStates,
              {
                state,
                signature
              }
            ],
            protocolLocator: action.protocolLocator
          })
        })
      );
  }
}
