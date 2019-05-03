import React from 'react';
import { Checklist, MessagesForStep, messagesForStep } from '../../../../../components/checklist';
import { unreachable } from '../../../../../utils/reducer-utils';
import { PlayerAState } from '../state';

interface Props {
  indirectFundingStateA: PlayerAState;
}

export enum Step {
  AWaitForPreFundSetup1,
  AWaitForDirectFunding,
  AWaitForLedgerUpdate1,
  AWaitForPostFundSetup1,
}

const fundingStepByState = (state: PlayerAState): Step => {
  switch (state.type) {
    case 'AWaitForPreFundSetup1':
      return Step.AWaitForPreFundSetup1;
    case 'AWaitForDirectFunding':
      return Step.AWaitForDirectFunding;
    case 'AWaitForLedgerUpdate1':
      return Step.AWaitForLedgerUpdate1;
    case 'AWaitForPostFundSetup1':
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
    const fundingState = this.props.indirectFundingStateA;
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
