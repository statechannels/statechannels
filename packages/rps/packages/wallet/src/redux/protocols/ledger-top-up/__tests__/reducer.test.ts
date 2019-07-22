import * as scenarios from './scenarios';
import { initialize, ledgerTopUpReducer } from '../reducer';
import { LedgerTopUpState, LedgerTopUpStateType } from '../states';
import { ProtocolStateWithSharedData } from '../..';
import { describeScenarioStep } from '../../../__tests__/helpers';
import { bsAddress, asAddress } from '../../../../domain/commitments/__tests__';
import { isTerminal } from '../../consensus-update';

describe('player A happy path', () => {
  const scenario = scenarios.playerAHappyPath;

  describe('when initializing', () => {
    const {
      channelId,
      sharedData,
      processId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      originalAllocation,
      protocolLocator,
    } = scenario.initialize;
    const initialState = initialize(
      processId,
      channelId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      originalAllocation,
      protocolLocator,
      sharedData,
    );
    it('requests the correct allocation/destination updates', () => {
      const consensusUpdate = getProposedConsensus(initialState.protocolState);
      expect(consensusUpdate.proposedAllocation).toEqual(['0x03', '0x04']);
      expect(consensusUpdate.proposedDestination).toEqual([bsAddress, asAddress]);
    });
    itTransitionsTo(initialState, 'LedgerTopUp.SwitchOrderAndAddATopUpUpdate');
  });

  describeScenarioStep(scenario.switchOrderAndAddATopUpUpdate, () => {
    const { action, sharedData, state } = scenario.switchOrderAndAddATopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'LedgerTopUp.WaitForDirectFundingForA');
    it('requests the correct deposit amount', () => {
      expect(getRequiredDeposit(updatedState.protocolState)).toEqual('0x02');
      expect(getTotalFundingRequired(updatedState.protocolState)).toEqual('0x07');
    });
  });

  describeScenarioStep(scenario.waitForDirectFundingForA, () => {
    const { action, sharedData, state } = scenario.waitForDirectFundingForA;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'LedgerTopUp.RestoreOrderAndAddBTopUpUpdate');
  });

  describeScenarioStep(scenario.restoreOrderAndAddBTopUpUpdate, () => {
    const { action, sharedData, state } = scenario.restoreOrderAndAddBTopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'LedgerTopUp.WaitForDirectFundingForB');
    it('requests the correct deposit amount', () => {
      expect(getRequiredDeposit(updatedState.protocolState)).toEqual('0x0');
      expect(getTotalFundingRequired(updatedState.protocolState)).toEqual('0x09');
    });
  });

  describeScenarioStep(scenario.waitForDirectFundingForB, () => {
    const { action, sharedData, state } = scenario.waitForDirectFundingForB;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'LedgerTopUp.Success');
  });
});

describe('player B happy path', () => {
  const scenario = scenarios.playerBHappyPath;
  describe('when initializing', () => {
    const {
      channelId,
      sharedData,
      processId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      originalAllocation,
      protocolLocator,
    } = scenario.initialize;
    const initialState = initialize(
      processId,
      channelId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      originalAllocation,
      protocolLocator,
      sharedData,
    );

    itTransitionsTo(initialState, 'LedgerTopUp.SwitchOrderAndAddATopUpUpdate');
    it('requests the correct allocation/destination updates', () => {
      const consensusUpdate = getProposedConsensus(initialState.protocolState);
      expect(consensusUpdate.proposedAllocation).toEqual(['0x03', '0x04']);
      expect(consensusUpdate.proposedDestination).toEqual([bsAddress, asAddress]);
    });
  });

  describeScenarioStep(scenario.switchOrderAndAddATopUpUpdate, () => {
    const { action, sharedData, state } = scenario.switchOrderAndAddATopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'LedgerTopUp.WaitForDirectFundingForA');
    it('requests the correct deposit amount', () => {
      expect(getRequiredDeposit(updatedState.protocolState)).toEqual('0x0');
      expect(getTotalFundingRequired(updatedState.protocolState)).toEqual('0x07');
    });
  });

  describeScenarioStep(scenario.waitForDirectFundingForA, () => {
    const { action, sharedData, state } = scenario.waitForDirectFundingForA;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'LedgerTopUp.RestoreOrderAndAddBTopUpUpdate');
  });

  describeScenarioStep(scenario.restoreOrderAndAddBTopUpUpdate, () => {
    const { action, sharedData, state } = scenario.restoreOrderAndAddBTopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'LedgerTopUp.WaitForDirectFundingForB');
    it('requests the correct deposit amount', () => {
      expect(getRequiredDeposit(updatedState.protocolState)).toEqual('0x02');
      expect(getTotalFundingRequired(updatedState.protocolState)).toEqual('0x09');
    });
  });

  describeScenarioStep(scenario.waitForDirectFundingForB, () => {
    const { action, sharedData, state } = scenario.waitForDirectFundingForB;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'LedgerTopUp.Success');
  });
});

describe('player A one user needs top up', () => {
  const scenario = scenarios.playerAOneUserNeedsTopUp;
  describe('when initializing', () => {
    const {
      channelId,
      sharedData,
      processId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      originalAllocation,
      protocolLocator,
    } = scenario.initialize;
    const initialState = initialize(
      processId,
      channelId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      originalAllocation,
      protocolLocator,
      sharedData,
    );

    itTransitionsTo(initialState, 'LedgerTopUp.SwitchOrderAndAddATopUpUpdate');
    it('requests the correct allocation/destination updates', () => {
      const consensusUpdate = getProposedConsensus(initialState.protocolState);
      expect(consensusUpdate.proposedAllocation).toEqual(['0x03', '0x04']);
      expect(consensusUpdate.proposedDestination).toEqual([bsAddress, asAddress]);
    });
  });

  describeScenarioStep(scenario.switchOrderAndAddATopUpUpdate, () => {
    const { action, sharedData, state } = scenario.switchOrderAndAddATopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'LedgerTopUp.WaitForDirectFundingForA');
    it('requests the correct deposit amount', () => {
      expect(getRequiredDeposit(updatedState.protocolState)).toEqual('0x02');
      expect(getTotalFundingRequired(updatedState.protocolState)).toEqual('0x07');
    });
  });

  describeScenarioStep(scenario.waitForDirectFundingForA, () => {
    const { action, sharedData, state } = scenario.waitForDirectFundingForA;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'LedgerTopUp.RestoreOrderAndAddBTopUpUpdate');
  });

  describeScenarioStep(scenario.restoreOrderAndAddBTopUpUpdate, () => {
    const { action, sharedData, state } = scenario.restoreOrderAndAddBTopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'LedgerTopUp.Success');
  });
});

describe('player B one user needs top up', () => {
  const scenario = scenarios.playerBOneUserNeedsTopUp;
  describe('when initializing', () => {
    const {
      channelId,
      sharedData,
      processId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      originalAllocation,
      protocolLocator,
    } = scenario.initialize;
    const initialState = initialize(
      processId,
      channelId,
      ledgerId,
      proposedAllocation,
      proposedDestination,
      originalAllocation,
      protocolLocator,
      sharedData,
    );

    itTransitionsTo(initialState, 'LedgerTopUp.SwitchOrderAndAddATopUpUpdate');
    it('requests the correct allocation/destination updates', () => {
      const consensusUpdate = getProposedConsensus(initialState.protocolState);
      expect(consensusUpdate.proposedAllocation).toEqual(['0x03', '0x04']);
      expect(consensusUpdate.proposedDestination).toEqual([bsAddress, asAddress]);
    });
  });

  describeScenarioStep(scenario.switchOrderAndAddATopUpUpdate, () => {
    const { action, sharedData, state } = scenario.switchOrderAndAddATopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'LedgerTopUp.WaitForDirectFundingForA');
    it('requests the correct deposit amount', () => {
      expect(getRequiredDeposit(updatedState.protocolState)).toEqual('0x0');
      expect(getTotalFundingRequired(updatedState.protocolState)).toEqual('0x07');
    });
  });

  describeScenarioStep(scenario.waitForDirectFundingForA, () => {
    const { action, sharedData, state } = scenario.waitForDirectFundingForA;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'LedgerTopUp.RestoreOrderAndAddBTopUpUpdate');
  });

  describeScenarioStep(scenario.restoreOrderAndAddBTopUpUpdate, () => {
    const { action, sharedData, state } = scenario.restoreOrderAndAddBTopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'LedgerTopUp.Success');
  });
});

type ReturnVal = ProtocolStateWithSharedData<LedgerTopUpState>;

function itTransitionsTo(state: ReturnVal, type: LedgerTopUpStateType) {
  it(`transitions protocol state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}

function getRequiredDeposit(protocolState: LedgerTopUpState): string {
  if ('directFundingState' in protocolState) {
    return protocolState.directFundingState.requiredDeposit;
  }
  return '0x0';
}

function getTotalFundingRequired(protocolState: LedgerTopUpState): string {
  if ('directFundingState' in protocolState) {
    return protocolState.directFundingState.totalFundingRequired;
  }
  return '0x0';
}

function getProposedConsensus(
  protocolState: LedgerTopUpState,
): { proposedAllocation: string[]; proposedDestination: string[] } {
  if ('consensusUpdateState' in protocolState && !isTerminal(protocolState.consensusUpdateState)) {
    const { proposedAllocation, proposedDestination } = protocolState.consensusUpdateState;
    return { proposedDestination, proposedAllocation };
  }
  return { proposedDestination: [], proposedAllocation: [] };
}
