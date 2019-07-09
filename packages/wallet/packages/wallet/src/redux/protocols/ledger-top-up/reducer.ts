import { SharedData, registerChannelToMonitor } from '../../state';
import * as states from './states';
import { ProtocolStateWithSharedData, ProtocolReducer } from '..';
import * as helpers from '../reducer-helpers';
import { TwoPartyPlayerIndex } from '../../types';
import {
  initialize as initializeDirectFunding,
  directFundingStateReducer,
} from '../direct-funding/reducer';
import { LedgerTopUpAction } from './actions';
import { directFundingRequested, isDirectFundingAction } from '../direct-funding/actions';
import { addHex, subHex } from '../../../utils/hex-utils';
import {
  initializeConsensusUpdate,
  isConsensusUpdateAction,
  consensusUpdateReducer,
} from '../consensus-update';
import { bigNumberify } from 'ethers/utils';
import { PlayerIndex } from 'magmo-wallet-client/lib/wallet-instructions';
export const LEDGER_TOP_UP_PROTOCOL_LOCATOR = 'LedgerTopUp';
export function initialize(
  processId: string,
  channelId: string,
  ledgerId: string,
  proposedAllocation: string[],
  proposedDestination: string[],
  originalAllocation: string[],
  sharedData: SharedData,
): ProtocolStateWithSharedData<states.LedgerTopUpState> {
  sharedData = registerChannelToMonitor(sharedData, processId, ledgerId);
  const { consensusUpdateState, sharedData: newSharedData } = initializeConsensusState(
    TwoPartyPlayerIndex.A,
    processId,
    ledgerId,
    proposedAllocation,
    proposedDestination,
    originalAllocation,

    sharedData,
  );
  const newProtocolState = states.switchOrderAndAddATopUpUpdate({
    processId,
    ledgerId,
    channelId,
    proposedAllocation,
    proposedDestination,
    consensusUpdateState,
    originalAllocation,
  });
  return { protocolState: newProtocolState, sharedData: newSharedData };
}

const restoreOrderAndAddBTopUpUpdateReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.SwitchOrderAndAddATopUpUpdate,
  sharedData: SharedData,
  action: LedgerTopUpAction,
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  if (!isConsensusUpdateAction(action)) {
    console.warn(`Received non consensus update action in ${protocolState.type} state.`);
    return { protocolState, sharedData };
  }
  const {
    protocolState: consensusUpdateState,
    sharedData: consensusUpdateSharedData,
  } = consensusUpdateReducer(protocolState.consensusUpdateState, sharedData, action);
  sharedData = consensusUpdateSharedData;
  const { processId, proposedAllocation, ledgerId, originalAllocation } = protocolState;

  if (consensusUpdateState.type === 'ConsensusUpdate.Failure') {
    return {
      protocolState: states.failure({ reason: 'ConsensusUpdateFailure' }),
      sharedData: consensusUpdateSharedData,
    };
  } else if (consensusUpdateState.type === 'ConsensusUpdate.Success') {
    // If player B already has enough funds then skip to success
    if (bigNumberify(originalAllocation[PlayerIndex.B]).gte(proposedAllocation[PlayerIndex.B])) {
      return { protocolState: states.success({}), sharedData: consensusUpdateSharedData };
    }
    const {
      directFundingState,
      sharedData: directFundingSharedData,
    } = initializeDirectFundingState(
      TwoPartyPlayerIndex.B,
      processId,
      ledgerId,
      proposedAllocation,
      originalAllocation,
      sharedData,
    );

    return {
      protocolState: states.waitForDirectFundingForB({ ...protocolState, directFundingState }),
      sharedData: directFundingSharedData,
    };
  } else {
    return {
      protocolState: states.restoreOrderAndAddBTopUpUpdate({
        ...protocolState,
        consensusUpdateState,
      }),
      sharedData,
    };
  }
};
const switchOrderAndAddATopUpUpdateReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.SwitchOrderAndAddATopUpUpdate,
  sharedData: SharedData,
  action: LedgerTopUpAction,
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  if (!isConsensusUpdateAction(action)) {
    console.warn(`Received non consensus update action in ${protocolState.type} state.`);
    return { protocolState, sharedData };
  }
  const {
    protocolState: consensusUpdateState,
    sharedData: consensusUpdateSharedData,
  } = consensusUpdateReducer(protocolState.consensusUpdateState, sharedData, action);
  sharedData = consensusUpdateSharedData;

  const {
    processId,
    ledgerId,
    originalAllocation,
    proposedAllocation,
    proposedDestination,
  } = protocolState;
  const lastCommitment = helpers.getLatestCommitment(protocolState.ledgerId, sharedData);

  if (consensusUpdateState.type === 'ConsensusUpdate.Failure') {
    return {
      protocolState: states.failure({ reason: 'ConsensusUpdateFailure' }),
      sharedData: consensusUpdateSharedData,
    };
  } else if (consensusUpdateState.type === 'ConsensusUpdate.Success') {
    // If player A already has enough funds we skip straight to the next ledger update step
    if (
      bigNumberify(originalAllocation[TwoPartyPlayerIndex.A]).gte(
        proposedAllocation[TwoPartyPlayerIndex.A],
      )
    ) {
      const {
        consensusUpdateState: consensusUpdateStateForB,
        sharedData: newSharedData,
      } = initializeConsensusState(
        TwoPartyPlayerIndex.B,
        processId,
        ledgerId,
        proposedAllocation,
        proposedDestination,
        lastCommitment.allocation,
        consensusUpdateSharedData,
      );

      return {
        protocolState: states.restoreOrderAndAddBTopUpUpdate({
          ...protocolState,
          consensusUpdateState: consensusUpdateStateForB,
        }),
        sharedData: newSharedData,
      };
    }

    const {
      directFundingState,
      sharedData: directFundingSharedData,
    } = initializeDirectFundingState(
      TwoPartyPlayerIndex.A,
      processId,
      ledgerId,
      proposedAllocation,
      originalAllocation,
      sharedData,
    );

    return {
      protocolState: states.waitForDirectFundingForA({ ...protocolState, directFundingState }),
      sharedData: directFundingSharedData,
    };
  } else {
    return {
      protocolState: states.switchOrderAndAddATopUpUpdate({
        ...protocolState,
        consensusUpdateState,
      }),
      sharedData,
    };
  }
};
const waitForDirectFundingForAReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.WaitForDirectFundingForA,
  sharedData: SharedData,
  action: LedgerTopUpAction,
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  if (!isDirectFundingAction(action)) {
    console.warn(`Received non direct funding action in ${protocolState.type} state.`);
    return { protocolState, sharedData };
  }

  const {
    protocolState: directFundingState,
    sharedData: directFundingSharedData,
  } = directFundingStateReducer(protocolState.directFundingState, sharedData, action);

  sharedData = directFundingSharedData;

  const lastCommitment = helpers.getLatestCommitment(protocolState.ledgerId, sharedData);
  const { ledgerId, processId, proposedAllocation, proposedDestination } = protocolState;

  if (directFundingState.type === 'DirectFunding.FundingFailure') {
    return { protocolState: states.failure({ reason: 'DirectFundingFailure' }), sharedData };
  } else if (directFundingState.type === 'DirectFunding.FundingSuccess') {
    const { consensusUpdateState, sharedData: newSharedData } = initializeConsensusState(
      TwoPartyPlayerIndex.B,
      processId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      lastCommitment.allocation,
      sharedData,
    );

    const newProtocolState = states.restoreOrderAndAddBTopUpUpdate({
      ...protocolState,
      consensusUpdateState,
    });
    return {
      protocolState: newProtocolState,
      sharedData: newSharedData,
    };
  } else {
    return { protocolState: { ...protocolState, directFundingState }, sharedData };
  }
};

const waitForDirectFundingForBReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.WaitForDirectFundingForB,
  sharedData: SharedData,
  action: LedgerTopUpAction,
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  if (!isDirectFundingAction(action)) {
    console.warn(`Received non direct funding action in ${protocolState.type} state.`);
    return { protocolState, sharedData };
  }

  const {
    protocolState: directFundingState,
    sharedData: directFundingSharedData,
  } = directFundingStateReducer(protocolState.directFundingState, sharedData, action);

  sharedData = directFundingSharedData;

  if (directFundingState.type === 'DirectFunding.FundingFailure') {
    return { protocolState: states.failure({ reason: 'DirectFundingFailure' }), sharedData };
  } else if (directFundingState.type === 'DirectFunding.FundingSuccess') {
    return { protocolState: states.success({}), sharedData };
  } else {
    return { protocolState: { ...protocolState, directFundingState }, sharedData };
  }
};

export const ledgerTopUpReducer: ProtocolReducer<states.LedgerTopUpState> = (
  protocolState: states.LedgerTopUpState,
  sharedData: SharedData,
  action: LedgerTopUpAction,
): ProtocolStateWithSharedData<states.LedgerTopUpState> => {
  switch (protocolState.type) {
    case 'LedgerTopUp.SwitchOrderAndAddATopUpUpdate':
      return switchOrderAndAddATopUpUpdateReducer(protocolState, sharedData, action);
    case 'LedgerTopUp.WaitForDirectFundingForA':
      return waitForDirectFundingForAReducer(protocolState, sharedData, action);
    case 'LedgerTopUp.RestoreOrderAndAddBTopUpUpdate':
      return restoreOrderAndAddBTopUpUpdateReducer(protocolState, sharedData, action);
    case 'LedgerTopUp.WaitForDirectFundingForB':
      return waitForDirectFundingForBReducer(protocolState, sharedData, action);
    default:
      return { protocolState, sharedData };
  }
};

function initializeDirectFundingState(
  playerFor: TwoPartyPlayerIndex,
  processId: string,
  ledgerId: string,
  proposedAllocation: string[],
  originalAllocation: string[],
  sharedData: SharedData,
) {
  const isFirstPlayer = helpers.isFirstPlayer(ledgerId, sharedData);

  let requiredDeposit = '0x0';

  if (playerFor === TwoPartyPlayerIndex.A && isFirstPlayer) {
    requiredDeposit = subHex(
      proposedAllocation[TwoPartyPlayerIndex.A],
      originalAllocation[TwoPartyPlayerIndex.A],
    );
  } else if (playerFor === TwoPartyPlayerIndex.B && !isFirstPlayer) {
    requiredDeposit = subHex(
      proposedAllocation[TwoPartyPlayerIndex.B],
      originalAllocation[TwoPartyPlayerIndex.B],
    );
  }

  let totalFundingRequired = '0x0';
  if (playerFor === TwoPartyPlayerIndex.A) {
    totalFundingRequired = addHex(
      proposedAllocation[TwoPartyPlayerIndex.A],
      originalAllocation[TwoPartyPlayerIndex.B],
    );
  } else if (playerFor === TwoPartyPlayerIndex.B) {
    totalFundingRequired = proposedAllocation.reduce(addHex);
  }

  const directFundingAction = directFundingRequested({
    processId,
    channelId: ledgerId,
    safeToDepositLevel: '0x0', // Since we only have one player depositing we can always deposit right away
    requiredDeposit,
    totalFundingRequired,
    ourIndex: isFirstPlayer ? TwoPartyPlayerIndex.A : TwoPartyPlayerIndex.B,
    exchangePostFundSetups: false,
  });

  const { protocolState: directFundingState, sharedData: newSharedData } = initializeDirectFunding(
    directFundingAction,
    sharedData,
  );
  return { directFundingState, sharedData: newSharedData };
}

function initializeConsensusState(
  playerFor: TwoPartyPlayerIndex,
  processId: string,
  ledgerId: string,
  proposedAllocation: string[],
  proposedDestination: string[],
  currentAllocation: string[],

  sharedData: SharedData,
) {
  let newAllocation;
  let newDestination;
  // For player A we want to move their top-upped deposit to the end and leave player B's as is
  if (playerFor === TwoPartyPlayerIndex.A) {
    const currentAllocationForA = currentAllocation[TwoPartyPlayerIndex.A];
    const proposedAllocationForA = proposedAllocation[TwoPartyPlayerIndex.A];

    const newAllocationForA = bigNumberify(currentAllocationForA).gte(proposedAllocationForA)
      ? currentAllocationForA
      : proposedAllocationForA;

    newAllocation = [currentAllocation[TwoPartyPlayerIndex.B], newAllocationForA];
    newDestination = [
      proposedDestination[TwoPartyPlayerIndex.B],
      proposedDestination[TwoPartyPlayerIndex.A],
    ];
  } else {
    // When we're handling this for player B the allocation has already been flipped, so our current value is first in the allocation
    const currentAllocationForB = currentAllocation[0];
    const currentAllocationForA = currentAllocation[1];
    const proposedAllocationForB = proposedAllocation[TwoPartyPlayerIndex.B];

    const newAllocationForB = bigNumberify(currentAllocationForB).gte(proposedAllocationForB)
      ? currentAllocationForB
      : proposedAllocationForB;
    // For Player B we're restoring the original order of [A,B]
    newAllocation = [currentAllocationForA, newAllocationForB];
    newDestination = proposedDestination;
  }
  const {
    protocolState: consensusUpdateState,
    sharedData: newSharedData,
  } = initializeConsensusUpdate(
    processId,
    ledgerId,
    true,
    newAllocation,
    newDestination,
    sharedData,
  );
  return { consensusUpdateState, sharedData: newSharedData };
}
