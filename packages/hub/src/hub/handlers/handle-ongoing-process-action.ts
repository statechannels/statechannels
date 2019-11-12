import {unreachable} from '@statechannels/wallet';

import {SignedStatesReceived, StrategyProposed} from '@statechannels/wallet/lib/src/communication';
import * as communication from '@statechannels/wallet/lib/src/communication';
import {errors} from '../../wallet';

import {getProcess} from '../../wallet/db/queries/walletProcess';

/* import {getChannelId, SignedState} from '@statechannels/nitro-protocol';
import {HUB_ADDRESS} from 'src/constants';
import {getCurrentState} from 'src/wallet/db/queries/getCurrentState';
import {updateLedgerChannel} from 'src/wallet/services'; */
import {MessageRelayRequested} from '../../wallet-client';

export async function handleOngoingProcessAction(
  action: StrategyProposed | SignedStatesReceived
): Promise<MessageRelayRequested[]> {
  switch (action.type) {
    case 'WALLET.COMMON.SIGNED_STATES_RECEIVED':
      // return handleSignedStatesReceived(action);
      return [];
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
  return [communication.sendStrategyApproved(theirAddress, processId, strategy)];
}

/*async function handleSignedStatesReceived(action: SignedStatesReceived) {
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
    const {commitment, signature} = await updateLedgerChannel(stateRound, currentState);

    return participants
      .filter((_, idx) => idx !== ourIndex)
      .map(p =>
        communication.sendCommitmentsReceived(
          p,
          processId,
          [
            ...incomingStates,
            {
              commitment,
              signature: (signature as unknown) as string,
              signedState: signCommitment2(commitment, HUB_PRIVATE_KEY).signedState
            }
          ],
          action.protocolLocator
        )
      );
  }
}*/
