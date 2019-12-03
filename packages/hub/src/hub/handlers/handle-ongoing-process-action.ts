import { SignedState } from '@statechannels/nitro-protocol';
import {
  ProtocolLocator,
  RelayActionWithMessage,
  SignedStatesReceived,
  StrategyApproved,
  StrategyProposed
} from '@statechannels/wallet/lib/src/communication';
import { ActionConstructor } from '@statechannels/wallet/lib/src/redux/utils';
import {HUB_ADDRESS, unreachable} from '../../constants';
import {errors} from '../../wallet';
import {getCurrentState} from '../../wallet/db/queries/getCurrentState';
import {getProcess} from '../../wallet/db/queries/walletProcess';
import {updateLedgerChannel} from '../../wallet/services';

export async function handleOngoingProcessAction(
  action: StrategyProposed | SignedStatesReceived
): Promise<RelayActionWithMessage[]> {
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
    relayActionWithMessage({
      toParticipantId: theirAddress,
      fromParticipantId: 'hub',
      actionToRelay: strategyApproved({processId, strategy})
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
        relayActionWithMessage({
          toParticipantId: p,
          fromParticipantId: 'hub',
          actionToRelay: signedStatesReceived({
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

// TODO: The following three helper functions are direct copy and paste from the wallet
// https://github.com/statechannels/monorepo/blob/1ce06fdc98456e268a341c6aec19ef8b0a86a510/packages/wallet/src/communication/actions.ts

export const signedStatesReceived = (p: {
  protocolLocator: ProtocolLocator;
  signedStates: SignedState[];
  processId: string;
}): SignedStatesReceived => ({
  ...p,
  type: "WALLET.COMMON.SIGNED_STATES_RECEIVED"
});

export const relayActionWithMessage: ActionConstructor<RelayActionWithMessage> = p => ({
  ...p,
  type: "WALLET.RELAY_ACTION_WITH_MESSAGE"
});

export const strategyApproved: ActionConstructor<StrategyApproved> = p => ({
  ...p,
  type: "WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED"
});

