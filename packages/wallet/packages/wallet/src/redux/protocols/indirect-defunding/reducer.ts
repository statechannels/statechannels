import { ProtocolStateWithSharedData, makeLocator } from '..';
import { SharedData } from '../../state';
import * as states from './states';
import { IndirectDefundingAction } from './actions';
import * as helpers from '../reducer-helpers';
import { unreachable } from '../../../utils/reducer-utils';
import { ProtocolLocator, EmbeddedProtocol } from '../../../communication';
import {
  ConsensusUpdateState,
  initializeConsensusUpdate,
  consensusUpdateReducer,
} from '../consensus-update';
import { routesToAdvanceChannel } from '../advance-channel/actions';
import { routesToConsensusUpdate } from '../consensus-update/actions';
import * as consensusUpdateActions from '../consensus-update/actions';
import * as advanceChannelActions from '../advance-channel/actions';
import {
  AdvanceChannelState,
  initializeAdvanceChannel,
  advanceChannelReducer,
} from '../advance-channel';
import { CommitmentType } from '../../../domain';

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
}): ProtocolStateWithSharedData<states.IndirectDefundingState> => {
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

  let concluding: AdvanceChannelState;
  const ourIndex = helpers.getTwoPlayerIndex(ledgerId, sharedData);
  ({ protocolState: concluding, sharedData } = initializeAdvanceChannel(sharedData, {
    ourIndex,
    commitmentType: CommitmentType.Conclude,
    channelId: ledgerId,
    processId,
    clearedToSend: false, // We only want to clear this to send after the ledger updating is done
    protocolLocator: makeLocator(protocolLocator, EmbeddedProtocol.AdvanceChannel),
  }));

  return {
    protocolState: states.waitForLedgerUpdate({
      processId,
      ledgerId,
      channelId,
      clearedToProceed,
      ledgerUpdate,
      concluding,
      protocolLocator,
    }),
    sharedData,
  };
};

export const indirectDefundingReducer = (
  protocolState: states.IndirectDefundingState,
  sharedData: SharedData,
  action: IndirectDefundingAction,
): ProtocolStateWithSharedData<states.IndirectDefundingState> => {
  if (action.type === 'WALLET.INDIRECT_DEFUNDING.CLEARED_TO_SEND') {
    return handleClearedToSend(protocolState, sharedData);
  }
  switch (protocolState.type) {
    case 'IndirectDefunding.WaitForLedgerUpdate':
      return waitForLedgerUpdateReducer(protocolState, sharedData, action);
    case 'IndirectDefunding.WaitForConclude':
      return waitForConcludeReducer(protocolState, sharedData, action);
    case 'IndirectDefunding.Success':
    case 'IndirectDefunding.Failure':
      return { protocolState, sharedData };
    default:
      return unreachable(protocolState);
  }
};

const handleClearedToSend = (
  protocolState: states.IndirectDefundingState,
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.IndirectDefundingState> => {
  // We only need to send clear to send to the consensus update reducer
  // as the advance channel only gets cleared to send after this state
  if (protocolState.type !== 'IndirectDefunding.WaitForLedgerUpdate') {
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

const waitForConcludeReducer = (
  protocolState: states.WaitForConclude,
  sharedData: SharedData,
  action: IndirectDefundingAction,
): ProtocolStateWithSharedData<states.IndirectDefundingState> => {
  if (!routesToAdvanceChannel(action, protocolState.protocolLocator)) {
    console.warn(`Received non-AdvanceChannel action in state ${protocolState.type}`);
    return { protocolState, sharedData };
  }
  let concluding: AdvanceChannelState;
  ({ protocolState: concluding, sharedData } = advanceChannelReducer(
    protocolState.concluding,
    sharedData,
    action,
  ));
  switch (concluding.type) {
    case 'AdvanceChannel.Failure':
      return { protocolState: states.failure({ reason: 'AdvanceChannel Failure' }), sharedData };
    case 'AdvanceChannel.Success':
      return {
        protocolState: states.success({}),
        sharedData,
      };
    default:
      return {
        protocolState: states.waitForConclude({ ...protocolState, concluding }),
        sharedData,
      };
  }
};

const waitForLedgerUpdateReducer = (
  protocolState: states.WaitForLedgerUpdate,
  sharedData: SharedData,
  action: IndirectDefundingAction,
): ProtocolStateWithSharedData<states.IndirectDefundingState> => {
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
  const { processId, protocolLocator } = protocolState;
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
      let concluding: AdvanceChannelState;
      ({ protocolState: concluding, sharedData } = advanceChannelReducer(
        protocolState.concluding,
        sharedData,
        advanceChannelActions.clearedToSend({
          processId,
          protocolLocator: makeLocator(protocolLocator, EmbeddedProtocol.AdvanceChannel),
        }),
      ));
      return {
        protocolState: states.waitForConclude({ ...protocolState, concluding }),
        sharedData,
      };
    default:
      return {
        protocolState: { ...protocolState, ledgerUpdate },
        sharedData,
      };
  }
}
