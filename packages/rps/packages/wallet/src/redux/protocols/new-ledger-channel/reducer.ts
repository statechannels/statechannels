import * as states from './states';
import { NewLedgerChannelState, failure } from './states';
import { SharedData, getPrivatekey, ChannelFundingState, setFundingState } from '../../state';
import { ProtocolStateWithSharedData, makeLocator } from '..';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator/lib/consensus-app';
import { CommitmentType } from '../../../domain';
import { CONSENSUS_LIBRARY_ADDRESS } from '../../../constants';
import { getChannel } from '../../channel-store';
import { DirectFundingAction } from '../direct-funding';
import { directFundingRequested } from '../direct-funding/actions';
import { isSuccess, isFailure, isTerminal } from '../direct-funding/states';
import {
  directFundingStateReducer,
  initialize as initializeDirectFunding,
} from '../direct-funding/reducer';
import { addHex } from '../../../utils/hex-utils';
import { unreachable } from '../../../utils/reducer-utils';
import { NewLedgerChannelAction } from './actions';
import { EmbeddedProtocol, ProtocolLocator } from '../../../communication';
import * as advanceChannelState from '../advance-channel/states';
import {
  clearedToSend as advanceChannelClearedToSend,
  routesToAdvanceChannel,
} from '../advance-channel/actions';
import {
  initializeAdvanceChannel,
  isAdvanceChannelAction,
  advanceChannelReducer,
} from '../advance-channel';
import { getLatestCommitment, isFirstPlayer, getTwoPlayerIndex } from '../reducer-helpers';
import { ADVANCE_CHANNEL_PROTOCOL_LOCATOR } from '../advance-channel/reducer';

type ReturnVal = ProtocolStateWithSharedData<NewLedgerChannelState>;
type IDFAction = NewLedgerChannelAction;
export const NEW_LEDGER_FUNDING_PROTOCOL_LOCATOR = makeLocator(EmbeddedProtocol.NewLedgerChannel);

export function initialize(
  processId: string,
  channelId: string,
  sharedData: SharedData,
  protocolLocator: ProtocolLocator,
): ProtocolStateWithSharedData<states.NonTerminalNewLedgerChannelState | states.Failure> {
  const privateKey = getPrivatekey(sharedData, channelId);
  const ourIndex = getTwoPlayerIndex(channelId, sharedData);
  const { allocation, destination, channel } = getLatestCommitment(channelId, sharedData);
  const initializationArgs = {
    privateKey,
    channelType: CONSENSUS_LIBRARY_ADDRESS,
    ourIndex,
    commitmentType: CommitmentType.PreFundSetup,
    clearedToSend: true,
    processId,
    protocolLocator: makeLocator(protocolLocator, ADVANCE_CHANNEL_PROTOCOL_LOCATOR),
    participants: channel.participants,
  };

  const advanceChannelResult = initializeAdvanceChannel(sharedData, {
    ...initializationArgs,
    ...channelSpecificArgs(allocation, destination),
  });
  sharedData = advanceChannelResult.sharedData;

  const protocolState = states.waitForPreFundSetup({
    channelId,
    processId,
    preFundSetupState: advanceChannelResult.protocolState,
    protocolLocator,
  });
  return { protocolState, sharedData };
}

export function NewLedgerChannelReducer(
  protocolState: states.NonTerminalNewLedgerChannelState,
  sharedData: SharedData,
  action: NewLedgerChannelAction,
): ReturnVal {
  switch (protocolState.type) {
    case 'NewLedgerChannel.WaitForPreFundSetup':
      return handleWaitForPreFundSetup(protocolState, sharedData, action);
    case 'NewLedgerChannel.WaitForDirectFunding':
      return handleWaitForDirectFunding(protocolState, sharedData, action);
    case 'NewLedgerChannel.WaitForPostFundSetup':
      return handleWaitForPostFundSetup(protocolState, sharedData, action);
    default:
      return unreachable(protocolState);
  }
}

function handleWaitForPostFundSetup(
  protocolState: states.WaitForPostFundSetup,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  if (!routesToAdvanceChannel(action, protocolState.protocolLocator)) {
    console.warn(`Expected an Advance Channel action received ${action.type} instead.`);
    return { protocolState, sharedData };
  }

  const advanceChannelResult = advanceChannelReducer(
    protocolState.postFundSetupState,
    sharedData,
    action,
  );
  sharedData = advanceChannelResult.sharedData;
  if (advanceChannelState.isTerminal(advanceChannelResult.protocolState)) {
    switch (advanceChannelResult.protocolState.type) {
      case 'AdvanceChannel.Failure':
        return { protocolState: failure({}), sharedData };
      case 'AdvanceChannel.Success':
        sharedData = updateFundingState(
          sharedData,
          protocolState.channelId,
          protocolState.ledgerId,
        );
        return {
          protocolState: states.success({
            ledgerId: protocolState.ledgerId,
          }),
          sharedData,
        };
      default:
        return unreachable(advanceChannelResult.protocolState);
    }
  } else {
    return {
      protocolState: {
        ...protocolState,
        postFundSetupState: advanceChannelResult.protocolState,
      },
      sharedData,
    };
  }
}

function handleWaitForPreFundSetup(
  protocolState: states.WaitForPreFundSetup,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  if (!isAdvanceChannelAction(action)) {
    console.warn(`Expected Advance Channel action but received ${action.type}`);
    return { protocolState, sharedData };
  }
  const preFundResult = advanceChannelReducer(protocolState.preFundSetupState, sharedData, action);
  sharedData = preFundResult.sharedData;
  if (!advanceChannelState.isTerminal(preFundResult.protocolState)) {
    return {
      protocolState: { ...protocolState, preFundSetupState: preFundResult.protocolState },
      sharedData,
    };
  } else {
    if (preFundResult.protocolState.type === 'AdvanceChannel.Failure') {
      return { protocolState: states.failure({}), sharedData };
    } else {
      const ledgerId = preFundResult.protocolState.channelId;
      const latestCommitment = getLatestCommitment(ledgerId, sharedData);

      const total = latestCommitment.allocation.reduce(addHex);
      const requiredDeposit = isFirstPlayer(protocolState.channelId, sharedData)
        ? latestCommitment.allocation[0]
        : latestCommitment.allocation[1];

      const safeToDepositLevel = isFirstPlayer(protocolState.channelId, sharedData)
        ? '0x0'
        : latestCommitment.allocation[1];
      const ourIndex = getTwoPlayerIndex(protocolState.channelId, sharedData);
      // update the state
      const directFundingAction = directFundingRequested({
        processId: protocolState.processId,
        channelId: ledgerId,
        safeToDepositLevel,
        totalFundingRequired: total,
        requiredDeposit,
        ourIndex,
      });
      const directFundingState = initializeDirectFunding(directFundingAction, sharedData);
      sharedData = directFundingState.sharedData;

      const advanceChannelResult = initializeAdvanceChannel(directFundingState.sharedData, {
        channelId: ledgerId,
        ourIndex,
        processId: protocolState.processId,
        commitmentType: CommitmentType.PostFundSetup,
        clearedToSend: false,
        protocolLocator: makeLocator(
          protocolState.protocolLocator,
          ADVANCE_CHANNEL_PROTOCOL_LOCATOR,
        ),
      });
      sharedData = advanceChannelResult.sharedData;
      const newProtocolState = states.waitForDirectFunding({
        ...protocolState,
        ledgerId,
        directFundingState: directFundingState.protocolState,
        postFundSetupState: advanceChannelResult.protocolState,
      });

      return { protocolState: newProtocolState, sharedData };
    }
  }
}

function handleWaitForDirectFunding(
  protocolState: states.WaitForDirectFunding,
  sharedData: SharedData,
  action: IDFAction | DirectFundingAction,
): ReturnVal {
  if (routesToAdvanceChannel(action, protocolState.protocolLocator)) {
    const advanceChannelResult = advanceChannelReducer(
      protocolState.postFundSetupState,
      sharedData,
      action,
    );
    sharedData = advanceChannelResult.sharedData;
    return {
      protocolState: {
        ...protocolState,
        postFundSetupState: advanceChannelResult.protocolState,
      },
      sharedData,
    };
  }
  const existingDirectFundingState = protocolState.directFundingState;
  const protocolStateWithSharedData = directFundingStateReducer(
    existingDirectFundingState,
    sharedData,
    action,
  );
  const newDirectFundingState = protocolStateWithSharedData.protocolState;
  const newProtocolState = { ...protocolState, directFundingState: newDirectFundingState };
  sharedData = protocolStateWithSharedData.sharedData;

  if (!isTerminal(newDirectFundingState)) {
    return { protocolState: newProtocolState, sharedData };
  }
  if (isFailure(newDirectFundingState)) {
    return { protocolState: states.failure({}), sharedData };
  }
  if (isSuccess(newDirectFundingState)) {
    const channel = getChannel(sharedData.channelStore, newProtocolState.ledgerId);
    if (!channel) {
      throw new Error(`Could not find channel for id ${newProtocolState.ledgerId}`);
    }
    const { processId } = protocolState;
    const advanceChannelResult = advanceChannelReducer(
      protocolState.postFundSetupState,
      sharedData,
      advanceChannelClearedToSend({
        processId,
        protocolLocator: makeLocator(
          protocolState.protocolLocator,
          ADVANCE_CHANNEL_PROTOCOL_LOCATOR,
        ),
      }),
    );

    sharedData = advanceChannelResult.sharedData;

    if (advanceChannelResult.protocolState.type === 'AdvanceChannel.Success') {
      sharedData = updateFundingState(sharedData, protocolState.channelId, protocolState.ledgerId);
      return {
        protocolState: states.success({ ledgerId: advanceChannelResult.protocolState.channelId }),
        sharedData,
      };
    } else if (advanceChannelResult.protocolState.type === 'AdvanceChannel.Failure') {
      return {
        protocolState: states.failure({ reason: 'AdvanceChannelFailure' }),
        sharedData,
      };
    } else {
      return {
        protocolState: states.waitForPostFundSetup({
          ...protocolState,
          postFundSetupState: advanceChannelResult.protocolState,
        }),
        sharedData,
      };
    }
  }

  return { protocolState, sharedData };
}

// TODO: This should be an advance channel helper
function channelSpecificArgs(
  allocation: string[],
  destination: string[],
): { allocation: string[]; destination: string[]; appAttributes: string } {
  return {
    allocation,
    destination,
    appAttributes: bytesFromAppAttributes({
      proposedAllocation: [],
      proposedDestination: [],
      furtherVotesRequired: 0,
    }),
  };
}

function updateFundingState(sharedData: SharedData, appChannelId: string, ledgerId: string) {
  const channelFundingState: ChannelFundingState = {
    directlyFunded: false,
    fundingChannel: ledgerId,
  };
  const ledgerFundingState: ChannelFundingState = {
    directlyFunded: true,
  };
  sharedData = setFundingState(sharedData, appChannelId, channelFundingState);
  sharedData = setFundingState(sharedData, ledgerId, ledgerFundingState);
  return sharedData;
}
