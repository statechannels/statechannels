import React from 'react';
import { Checklist, MessagesForStep, messagesForStep } from '../../../../../components/checklist';
import { unreachable } from '../../../../../utils/reducer-utils';
import { PlayerBState } from '../state';

interface Props {
  indirectFundingStateB: PlayerBState;
}

export enum Step {
  BWaitForPreFundSetup1,
  BWaitForDirectFunding,
  BWaitForLedgerUpdate1,
  BWaitForPostFundSetup1,
}

const fundingStepByState = (state: PlayerBState): Step => {
  switch (state.type) {
    case 'BWaitForPreFundSetup0':
      return Step.BWaitForPreFundSetup1;
    case 'BWaitForDirectFunding':
      return Step.BWaitForDirectFunding;
    case 'BWaitForLedgerUpdate0':
      return Step.BWaitForLedgerUpdate1;
    case 'BWaitForPostFundSetup0':
      return Step.BWaitForPostFundSetup1;
    default:
      return unreachable(state);
  }
};

const messagesForStepList: MessagesForStep[] = [
  messagesForStep(
    'Open a ledger channel', // UNUSED
    'Waiting for opponent...',
    'Ledger channel opened',
  ),
  messagesForStep(
    'Fund the ledger channel',
    'Waiting for direct funding....',
    'Ledger channel funded',
  ),
  messagesForStep(
    'Fund application from ledger channel',
    'Waiting for opponent...',
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
    const fundingState = this.props.indirectFundingStateB;
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
