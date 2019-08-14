import * as states from './states';
import { ProtocolStateWithSharedData, makeLocator, ProtocolReducer } from '..';
import { SharedData } from '../../state';
import { ProtocolLocator } from '../../../communication';
import { ConsensusUpdateState, initializeConsensusUpdate } from '../consensus-update';
import {
  CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
  consensusUpdateReducer,
} from '../consensus-update/reducer';
import { getChannelFundingState } from '../../selectors';
import { getLatestCommitment, getTwoPlayerIndex, getFundingChannelId } from '../reducer-helpers';
import { addHex } from '../../../utils/hex-utils';
import { VirtualDefundingAction } from './actions';
import { routesToConsensusUpdate } from '../consensus-update/actions';
import { HUB_ADDRESS } from '../../../constants';

export function initialize({
  processId,
  targetChannelId,
  protocolLocator,
  sharedData,
}: {
  processId: string;
  targetChannelId: string;
  protocolLocator: ProtocolLocator;
  sharedData: SharedData;
}): ProtocolStateWithSharedData<states.NonTerminalVirtualDefundingState> {
  const fundingState = getChannelFundingState(sharedData, targetChannelId);
  if (!fundingState || !fundingState.fundingChannel) {
    throw new Error(`Attempting to virtually defund a directly funded channel ${targetChannelId}`);
  }
  const jointChannelId = fundingState.fundingChannel;
  const latestAppCommitment = getLatestCommitment(targetChannelId, sharedData);
  const ourIndex = getTwoPlayerIndex(targetChannelId, sharedData);
  const hubAddress = HUB_ADDRESS;
  const proposedDestination = [...latestAppCommitment.destination, hubAddress];
  const proposedAllocation = [
    ...latestAppCommitment.allocation,
    latestAppCommitment.allocation.reduce(addHex),
  ];
  let jointChannel: ConsensusUpdateState;
  ({ protocolState: jointChannel, sharedData } = initializeConsensusUpdate({
    processId,
    protocolLocator: makeLocator(protocolLocator, CONSENSUS_UPDATE_PROTOCOL_LOCATOR),
    clearedToSend: true,
    channelId: jointChannelId,
    proposedAllocation,
    proposedDestination,
    sharedData,
  }));
  const ledgerChannelId = getFundingChannelId(targetChannelId, sharedData);
  return {
    protocolState: states.waitForJointChannelUpdate({
      processId,
      ourIndex,
      hubAddress,
      jointChannel,
      jointChannelId,
      targetChannelId,
      ledgerChannelId,
      protocolLocator,
    }),
    sharedData,
  };
}

export const reducer: ProtocolReducer<states.VirtualDefundingState> = (
  protocolState: states.NonTerminalVirtualDefundingState,
  sharedData: SharedData,
  action: VirtualDefundingAction,
) => {
  switch (protocolState.type) {
    case 'VirtualDefunding.WaitForJointChannelUpdate':
      return waitForJointChannelUpdateReducer(protocolState, sharedData, action);
    case 'VirtualDefunding.WaitForLedgerChannelUpdate':
      return waitForLedgerChannelUpdateReducer(protocolState, sharedData, action);
    default:
      return { protocolState, sharedData };
  }
};

function waitForJointChannelUpdateReducer(
  protocolState: states.WaitForJointChannelUpdate,
  sharedData: SharedData,
  action: VirtualDefundingAction,
): ProtocolStateWithSharedData<states.VirtualDefundingState> {
  if (routesToConsensusUpdate(action, protocolState.protocolLocator)) {
    let jointChannel: ConsensusUpdateState;
    ({ protocolState: jointChannel, sharedData } = consensusUpdateReducer(
      protocolState.jointChannel,
      sharedData,
      action,
    ));
    switch (jointChannel.type) {
      case 'ConsensusUpdate.Failure':
        return { protocolState: states.failure({}), sharedData };
      case 'ConsensusUpdate.Success':
        const {
          hubAddress,
          ledgerChannelId,
          targetChannelId: appChannelId,
          ourIndex,
          processId,
        } = protocolState;
        // TODO: We probably need to start this earlier to deal with commitments coming in early

        const latestAppCommitment = getLatestCommitment(appChannelId, sharedData);

        const proposedAllocation = [
          latestAppCommitment.allocation[ourIndex],
          latestAppCommitment.allocation[1 - ourIndex],
        ];
        const proposedDestination = [latestAppCommitment.destination[ourIndex], hubAddress];
        let ledgerChannel: ConsensusUpdateState;
        ({ protocolState: ledgerChannel, sharedData } = initializeConsensusUpdate({
          processId,
          protocolLocator: makeLocator(
            protocolState.protocolLocator,
            CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
          ),
          channelId: ledgerChannelId,
          proposedAllocation,
          proposedDestination,
          clearedToSend: true,
          sharedData,
        }));

        return {
          protocolState: states.waitForLedgerChannelUpdate({ ...protocolState, ledgerChannel }),
          sharedData,
        };
      default:
        return {
          protocolState: { ...protocolState, jointChannel },
          sharedData,
        };
    }
  }
  return { protocolState, sharedData };
}

function waitForLedgerChannelUpdateReducer(
  protocolState: states.WaitForLedgerChannelUpdate,
  sharedData: SharedData,
  action: VirtualDefundingAction,
): ProtocolStateWithSharedData<states.VirtualDefundingState> {
  if (routesToConsensusUpdate(action, protocolState.protocolLocator)) {
    let ledgerChannel: ConsensusUpdateState;
    ({ protocolState: ledgerChannel, sharedData } = consensusUpdateReducer(
      protocolState.ledgerChannel,
      sharedData,
      action,
    ));
    switch (ledgerChannel.type) {
      case 'ConsensusUpdate.Failure':
        return { protocolState: states.failure({}), sharedData };
      case 'ConsensusUpdate.Success':
        return { protocolState: states.success({}), sharedData };
      default:
        return {
          protocolState: { ...protocolState, ledgerChannel },
          sharedData,
        };
    }
  }
  return { protocolState, sharedData };
}
