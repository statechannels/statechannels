import * as states from './states';
import { SharedData, getPrivatekey } from '../../state';
import { ProtocolStateWithSharedData, ProtocolReducer, makeLocator } from '..';
import { WalletAction, advanceChannel } from '../../actions';
import { VirtualFundingAction } from './actions';
import { unreachable } from '../../../utils/reducer-utils';
import { CommitmentType } from '../../../domain';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator/lib/consensus-app';
import { CONSENSUS_LIBRARY_ADDRESS } from '../../../constants';
import { advanceChannelReducer } from '../advance-channel';
import * as consensusUpdate from '../consensus-update';
import * as indirectFunding from '../indirect-funding';
import { ethers } from 'ethers';
import { addHex } from '../../../utils/hex-utils';
import { ADVANCE_CHANNEL_PROTOCOL_LOCATOR } from '../advance-channel/reducer';
import { routesToAdvanceChannel } from '../advance-channel/actions';
import { routesToIndirectFunding } from '../indirect-funding/actions';
import { routesToConsensusUpdate } from '../consensus-update/actions';
import { EmbeddedProtocol } from '../../../communication';

export const VIRTUAL_FUNDING_PROTOCOL_LOCATOR = 'VirtualFunding';
import { getLatestCommitment } from '../reducer-helpers';
import { CONSENSUS_UPDATE_PROTOCOL_LOCATOR } from '../consensus-update/reducer';

export function initialize(
  sharedData: SharedData,
  args: states.InitializationArgs,
): ProtocolStateWithSharedData<states.NonTerminalVirtualFundingState> {
  const {
    ourIndex,
    processId,
    targetChannelId,
    startingAllocation,
    startingDestination,
    hubAddress,
    protocolLocator,
  } = args;
  const privateKey = getPrivatekey(sharedData, targetChannelId);
  const channelType = CONSENSUS_LIBRARY_ADDRESS;

  const initializationArgs = {
    privateKey,
    channelType,
    ourIndex,
    commitmentType: CommitmentType.PreFundSetup,
    clearedToSend: true,
    processId,
    protocolLocator: makeLocator(protocolLocator, ADVANCE_CHANNEL_PROTOCOL_LOCATOR),
    participants: [...startingDestination, hubAddress],
  };

  const jointAllocation = [...startingAllocation, startingAllocation.reduce(addHex)];
  const jointDestination = [...startingDestination, hubAddress];
  const jointChannelInitialized = advanceChannel.initializeAdvanceChannel(sharedData, {
    ...initializationArgs,
    ...channelSpecificArgs(jointAllocation, jointDestination),
  });

  return {
    protocolState: states.waitForJointChannel({
      processId,
      jointChannel: jointChannelInitialized.protocolState,
      targetChannelId,
      startingAllocation,
      startingDestination,
      ourIndex,
      hubAddress,
      protocolLocator,
    }),
    sharedData: jointChannelInitialized.sharedData,
  };
}

export const reducer: ProtocolReducer<states.VirtualFundingState> = (
  protocolState: states.NonTerminalVirtualFundingState,
  sharedData: SharedData,
  action: VirtualFundingAction,
) => {
  switch (protocolState.type) {
    case 'VirtualFunding.WaitForJointChannel': {
      return waitForJointChannelReducer(protocolState, sharedData, action);
    }
    case 'VirtualFunding.WaitForGuarantorChannel': {
      return waitForGuarantorChannelReducer(protocolState, sharedData, action);
    }
    case 'VirtualFunding.WaitForGuarantorFunding': {
      return waitForGuarantorFundingReducer(protocolState, sharedData, action);
    }
    case 'VirtualFunding.WaitForApplicationFunding': {
      return waitForApplicationFundingReducer(protocolState, sharedData, action);
    }
    default:
      return unreachable(protocolState);
  }
};

function waitForJointChannelReducer(
  protocolState: states.WaitForJointChannel,
  sharedData: SharedData,
  action: WalletAction,
) {
  const { processId, hubAddress, ourIndex } = protocolState;
  if (routesToAdvanceChannel(action, protocolState.protocolLocator)) {
    const result = advanceChannelReducer(protocolState.jointChannel, sharedData, action);

    if (advanceChannel.isSuccess(result.protocolState)) {
      const { channelId: jointChannelId } = result.protocolState;
      switch (result.protocolState.commitmentType) {
        case CommitmentType.PreFundSetup:
          const jointChannelResult = advanceChannel.initializeAdvanceChannel(result.sharedData, {
            clearedToSend: true,
            commitmentType: CommitmentType.PostFundSetup,
            processId,
            protocolLocator: ADVANCE_CHANNEL_PROTOCOL_LOCATOR,
            channelId: jointChannelId,
            ourIndex,
          });

          return {
            protocolState: {
              ...protocolState,
              jointChannel: jointChannelResult.protocolState,
            },
            sharedData: jointChannelResult.sharedData,
          };
        case CommitmentType.PostFundSetup:
          const { targetChannelId } = protocolState;
          const privateKey = getPrivatekey(sharedData, targetChannelId);
          const ourAddress = new ethers.Wallet(privateKey).address;
          const channelType = CONSENSUS_LIBRARY_ADDRESS;
          const destination = [targetChannelId, ourAddress, hubAddress];
          const guarantorChannelResult = advanceChannel.initializeAdvanceChannel(
            result.sharedData,
            {
              clearedToSend: true,
              commitmentType: CommitmentType.PreFundSetup,
              processId,
              protocolLocator: ADVANCE_CHANNEL_PROTOCOL_LOCATOR,
              ourIndex,
              privateKey,
              channelType,
              participants: [ourAddress, hubAddress],
              ...channelSpecificArgs([], destination),
            },
          );
          return {
            protocolState: states.waitForGuarantorChannel({
              ...protocolState,
              guarantorChannel: guarantorChannelResult.protocolState,
              jointChannelId,
            }),
            sharedData: guarantorChannelResult.sharedData,
          };
        default:
          return {
            protocolState: states.waitForJointChannel({
              ...protocolState,
              jointChannel: result.protocolState,
            }),
            sharedData: result.sharedData,
          };
      }
    } else {
      return {
        protocolState: states.waitForJointChannel({
          ...protocolState,
          jointChannel: result.protocolState,
        }),
        sharedData: result.sharedData,
      };
    }
  }
  return { protocolState, sharedData };
}

function waitForGuarantorChannelReducer(
  protocolState: states.WaitForGuarantorChannel,
  sharedData: SharedData,
  action: WalletAction,
) {
  const { processId, ourIndex } = protocolState;
  if (routesToAdvanceChannel(action, protocolState.protocolLocator)) {
    const result = advanceChannelReducer(protocolState.guarantorChannel, sharedData, action);
    if (advanceChannel.isSuccess(result.protocolState)) {
      const { channelId: guarantorChannelId } = result.protocolState;

      switch (result.protocolState.commitmentType) {
        case CommitmentType.PreFundSetup:
          const guarantorChannelResult = advanceChannel.initializeAdvanceChannel(
            result.sharedData,
            {
              clearedToSend: true,
              commitmentType: CommitmentType.PostFundSetup,
              processId,
              protocolLocator: ADVANCE_CHANNEL_PROTOCOL_LOCATOR,
              channelId: guarantorChannelId,
              ourIndex,
            },
          );
          return {
            protocolState: {
              ...protocolState,
              jointChannel: guarantorChannelResult.protocolState,
            },
            sharedData: guarantorChannelResult.sharedData,
          };

        case CommitmentType.PostFundSetup:
          const latestCommitment = getLatestCommitment(guarantorChannelId, sharedData);
          const indirectFundingResult = indirectFunding.initializeIndirectFunding({
            processId,
            channelId: result.protocolState.channelId,
            targetAllocation: latestCommitment.allocation,
            targetDestination: latestCommitment.destination,
            sharedData: result.sharedData,
            protocolLocator: makeLocator(
              protocolState.protocolLocator,
              EmbeddedProtocol.IndirectFunding,
            ),
          });
          switch (indirectFundingResult.protocolState.type) {
            case 'IndirectFunding.Failure':
              return {
                protocolState: states.failure({}),
                sharedData: indirectFundingResult.sharedData,
              };
            default:
              return {
                protocolState: states.waitForGuarantorFunding({
                  ...protocolState,
                  indirectGuarantorFunding: indirectFundingResult.protocolState,
                }),
                sharedData: indirectFundingResult.sharedData,
              };
          }

        default:
          return {
            protocolState: states.waitForGuarantorChannel({
              ...protocolState,
              guarantorChannel: result.protocolState,
            }),
            sharedData: result.sharedData,
          };
      }
    } else {
      return {
        protocolState: states.waitForGuarantorChannel({
          ...protocolState,
          guarantorChannel: result.protocolState,
        }),
        sharedData: result.sharedData,
      };
    }
  }
  return { protocolState, sharedData };
}

function waitForGuarantorFundingReducer(
  protocolState: states.WaitForGuarantorFunding,
  sharedData: SharedData,
  action: WalletAction,
) {
  const {
    processId,
    jointChannelId,
    startingAllocation,
    targetChannelId,
    protocolLocator,
  } = protocolState;
  if (routesToIndirectFunding(action, protocolLocator)) {
    const result = indirectFunding.indirectFundingReducer(
      protocolState.indirectGuarantorFunding,
      sharedData,
      action,
    );
    if (indirectFunding.isTerminal(result.protocolState)) {
      switch (result.protocolState.type) {
        case 'IndirectFunding.Success':
          const proposedAllocation = [startingAllocation.reduce(addHex)];
          const proposedDestination = [targetChannelId];

          const applicationFundingResult = consensusUpdate.initializeConsensusUpdate({
            processId,
            channelId: jointChannelId,
            clearedToSend: true,
            proposedAllocation,
            proposedDestination,
            protocolLocator: makeLocator(
              protocolState.protocolLocator,
              CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
            ),
            sharedData: result.sharedData,
          });
          return {
            protocolState: states.waitForApplicationFunding({
              ...protocolState,
              indirectApplicationFunding: applicationFundingResult.protocolState,
            }),
            sharedData: applicationFundingResult.sharedData,
          };
        case 'IndirectFunding.Failure':
          throw new Error(`Indirect funding failed: ${result.protocolState.reason}`);

        default:
          return unreachable(result.protocolState);
      }
    } else {
      return {
        protocolState: states.waitForGuarantorFunding({
          ...protocolState,
          indirectGuarantorFunding: result.protocolState,
        }),
        sharedData: result.sharedData,
      };
    }
  }
  return { protocolState, sharedData };
}

function waitForApplicationFundingReducer(
  protocolState: states.WaitForApplicationFunding,
  sharedData: SharedData,
  action: WalletAction,
) {
  if (routesToConsensusUpdate(action, protocolState.protocolLocator)) {
    const result = consensusUpdate.consensusUpdateReducer(
      protocolState.indirectApplicationFunding,
      sharedData,
      action,
    );
    if (consensusUpdate.isTerminal(result.protocolState)) {
      switch (result.protocolState.type) {
        case 'ConsensusUpdate.Success':
          return {
            protocolState: states.success(protocolState),
            sharedData: result.sharedData,
          };
        case 'ConsensusUpdate.Failure':
          throw new Error(`Indirect funding failed: ${result.protocolState.reason}`);

        default:
          return unreachable(result.protocolState);
      }
    } else {
      return {
        protocolState: states.waitForApplicationFunding({
          ...protocolState,
          indirectApplicationFunding: result.protocolState,
        }),
        sharedData: result.sharedData,
      };
    }
  }
  return { protocolState, sharedData };
}

function channelSpecificArgs(
  allocation: string[],
  destination: string[],
): { allocation: string[]; destination: string[]; appAttributes: string } {
  return {
    allocation,
    destination,
    appAttributes: bytesFromAppAttributes({
      proposedAllocation: allocation,
      proposedDestination: destination,
      furtherVotesRequired: 0,
    }),
  };
}
