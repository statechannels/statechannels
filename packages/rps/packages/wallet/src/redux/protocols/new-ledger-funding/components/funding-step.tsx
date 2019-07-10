import React from 'react';
import { Checklist, MessagesForStep, messagesForStep } from '../../shared-components/checklist';
import { NonTerminalNewLedgerFundingState } from '../states';
import { unreachable } from '../../../../utils/reducer-utils';

interface Props {
  newLedgerFundingState: NonTerminalNewLedgerFundingState;
}

export enum Step {
  AWaitForPreFundSetup1,
  AWaitForDirectFunding,
  AWaitForLedgerUpdate1,
  AWaitForPostFundSetup1,
}

const fundingStepByState = (state: NonTerminalNewLedgerFundingState): Step => {
  switch (state.type) {
    case 'NewLedgerFunding.WaitForPreFundSetup':
      return Step.AWaitForPreFundSetup1;
    case 'NewLedgerFunding.WaitForDirectFunding':
      return Step.AWaitForDirectFunding;
    case 'NewLedgerFunding.WaitForLedgerUpdate':
      return Step.AWaitForLedgerUpdate1;
    case 'NewLedgerFunding.WaitForPostFundSetup':
      return Step.AWaitForPostFundSetup1;
    default:
      return unreachable(state);
  }
};

const messagesForStepList: MessagesForStep[] = [
  messagesForStep(
    'Open a ledger channel', // UNUSED
    'Waiting for opponent confirmation...',
    'Ledger channel opened',
  ),
  messagesForStep(
    'Fund the ledger channel',
    'Waiting for direct funding....',
    'Ledger channel funded',
  ),
  messagesForStep(
    'Fund application from ledger channel',
    'Waiting for opponent to confirm...',
    'Application channel funded',
  ),
  messagesForStep(
    'Exchange opening commitments',
    'Waiting for opponent...',
    'Application ready', // UNUSED
  ),
];

export class FundingStep extends React.PureComponent<Props> {
  render() {
    const fundingState = this.props.newLedgerFundingState;
    const currentStep = fundingStepByState(fundingState);

    return (
      <Checklist
        step={currentStep}
        stepMessages={messagesForStepList}
        title="Indirectly funding a channel"
      />
    );
  }
}
