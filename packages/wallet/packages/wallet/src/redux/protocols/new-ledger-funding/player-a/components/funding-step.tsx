import React from 'react';
import { Checklist, MessagesForStep, messagesForStep } from '../../../shared-components/checklist';
import { unreachable } from '../../../../../utils/reducer-utils';
import { PlayerAState } from '../states';

interface Props {
  newLedgerFundingStateA: PlayerAState;
}

export enum Step {
  AWaitForPreFundSetup1,
  AWaitForDirectFunding,
  AWaitForLedgerUpdate1,
  AWaitForPostFundSetup1,
}

const fundingStepByState = (state: PlayerAState): Step => {
  switch (state.type) {
    case 'NewLedgerFunding.AWaitForPreFundSetup1':
      return Step.AWaitForPreFundSetup1;
    case 'NewLedgerFunding.AWaitForDirectFunding':
      return Step.AWaitForDirectFunding;
    case 'NewLedgerFunding.AWaitForLedgerUpdate1':
      return Step.AWaitForLedgerUpdate1;
    case 'NewLedgerFunding.AWaitForPostFundSetup1':
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
    const fundingState = this.props.newLedgerFundingStateA;
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
