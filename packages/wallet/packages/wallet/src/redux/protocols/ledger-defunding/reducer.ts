import { ProtocolStateWithSharedData, makeLocator } from '..';
import { SharedData } from '../../state';
import * as states from './states';
import { LedgerDefundingAction } from './actions';
import { unreachable } from '../../../utils/reducer-utils';
import { ProtocolLocator, EmbeddedProtocol } from '../../../communication';
import {
  ConsensusUpdateState,
  initializeConsensusUpdate,
  consensusUpdateReducer,
} from '../consensus-update';
import { routesToConsensusUpdate } from '../consensus-update/actions';
import * as consensusUpdateActions from '../consensus-update/actions';

export const initialize = ({
  processId,
  channelId,
  ledgerId,
  proposedAllocation,
  proposedDestination,
  sharedData,
  clearedToProceed,
  protocolLocator,
}: {
  processId: string;
  channelId: string;
  ledgerId: string;
  proposedAllocation: string[];
  proposedDestination: string[];
  sharedData: SharedData;
  clearedToProceed: boolean;
  protocolLocator: ProtocolLocator;
}): ProtocolStateWithSharedData<states.LedgerDefundingState> => {
  let ledgerUpdate: ConsensusUpdateState;
  ({ protocolState: ledgerUpdate, sharedData } = initializeConsensusUpdate({
    processId,
    proposedAllocation,
    proposedDestination,
    channelId: ledgerId,
    clearedToSend: clearedToProceed,
    protocolLocator,
    sharedData,
  }));

  return {
    protocolState: states.waitForLedgerUpdate({
      processId,
      ledgerId,
      channelId,
      clearedToProceed,
      ledgerUpdate,

      protocolLocator,
    }),
    sharedData,
  };
};

export const ledgerDefundingReducer = (
  protocolState: states.LedgerDefundingState,
  sharedData: SharedData,
  action: LedgerDefundingAction,
): ProtocolStateWithSharedData<states.LedgerDefundingState> => {
  if (action.type === 'WALLET.LEDGER_DEFUNDING.CLEARED_TO_SEND') {
    return handleClearedToSend(protocolState, sharedData);
  }
  switch (protocolState.type) {
    case 'LedgerDefunding.WaitForLedgerUpdate':
      return waitForLedgerUpdateReducer(protocolState, sharedData, action);

    case 'LedgerDefunding.Success':
    case 'LedgerDefunding.Failure':
      return { protocolState, sharedData };
    default:
      return unreachable(protocolState);
  }
};

const handleClearedToSend = (
  protocolState: states.LedgerDefundingState,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.LedgerDefundingState> => {
  // We only need to send clear to send to the consensus update reducer
  // as the advance channel only gets cleared to send after this state
  if (protocolState.type !== 'LedgerDefunding.WaitForLedgerUpdate') {
    console.warn(`Received ClearedToSend in state ${protocolState.type}`);
    return {
      protocolState,
      sharedData,
    };
  }
  const { processId, protocolLocator } = protocolState;
  return handleConsensusUpdateAction(
    protocolState,
    sharedData,
    consensusUpdateActions.clearedToSend({
      processId,
      protocolLocator: makeLocator(protocolLocator, EmbeddedProtocol.ConsensusUpdate),
    }),
  );
};

const waitForLedgerUpdateReducer = (
  protocolState: states.WaitForLedgerUpdate,
  sharedData: SharedData,
  action: LedgerDefundingAction,
): ProtocolStateWithSharedData<states.LedgerDefundingState> => {
  if (!routesToConsensusUpdate(action, protocolState.protocolLocator)) {
    console.warn(`Received non-ConsensusUpdate action in state ${protocolState.type}`);
    return { protocolState, sharedData };
  }
  return handleConsensusUpdateAction(protocolState, sharedData, action);
};

function handleConsensusUpdateAction(
  protocolState: states.WaitForLedgerUpdate,
  sharedData: SharedData,
  action: consensusUpdateActions.ConsensusUpdateAction,
) {
  let ledgerUpdate: ConsensusUpdateState;
  ({ protocolState: ledgerUpdate, sharedData } = consensusUpdateReducer(
    protocolState.ledgerUpdate,
    sharedData,
    action,
  ));
  switch (ledgerUpdate.type) {
    case 'ConsensusUpdate.Failure':
      return {
        protocolState: states.failure({ reason: 'Consensus Update Failure' }),
        sharedData,
      };
    case 'ConsensusUpdate.Success':
      return { protocolState: states.success({}), sharedData };
    default:
      return {
        protocolState: { ...protocolState, ledgerUpdate },
        sharedData,
      };
  }
}
