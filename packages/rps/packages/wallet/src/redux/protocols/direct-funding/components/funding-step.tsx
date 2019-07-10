import React from 'react';
import { Checklist, MessagesForStep, messagesForStep } from '../../shared-components/checklist';
import { unreachable } from '../../../../utils/reducer-utils';
import * as directFundingState from '../states';

interface Props {
  directFundingState: directFundingState.DirectFundingState;
}

export enum Step {
  NOT_SAFE_TO_DEPOSIT,
  WAIT_FOR_DEPOSIT_TRANSACTION,
  WAITING_FOR_FUNDING_CONFIRMATION,
  CHANNEL_FUNDED,
  FUNDING_FAILED,
}

const fundingStepByState = (state: directFundingState.DirectFundingState): Step => {
  switch (state.type) {
    case 'DirectFunding.NotSafeToDeposit':
      return Step.NOT_SAFE_TO_DEPOSIT;
    case 'DirectFunding.WaitForDepositTransaction':
      return Step.WAIT_FOR_DEPOSIT_TRANSACTION;
    case 'DirectFunding.WaitForFunding':
      return Step.WAITING_FOR_FUNDING_CONFIRMATION;
    case 'DirectFunding.FundingSuccess':
      return Step.CHANNEL_FUNDED;
    case 'DirectFunding.FundingFailure':
      // todo: restrict this to non-terminal states
      return Step.FUNDING_FAILED;
    default:
      return unreachable(state);
  }
};

const messagesForStepList: MessagesForStep[] = [
  messagesForStep(
    "It's not safe to deposit yet",
    "Waiting for opponent's deposit...",
    "It's safe to deposit",
  ),
  messagesForStep('Not ready to submit transaction', 'UNUSED', 'Transaction submission success'),
  messagesForStep(
    'Not listening for fund confirmation',
    'Listening for fund confirmation',
    'Adjudicator funded',
  ),
  messagesForStep('Channel not yet funded', 'Channel is funded', 'UNUSED'),
];

export class FundingStep extends React.PureComponent<Props> {
  render() {
    const fundingState = this.props.directFundingState;
    const currentStep = fundingStepByState(fundingState);

    return (
      <Checklist
        step={currentStep}
        stepMessages={messagesForStepList}
        title="Directly funding a channel"
      />
    );
  }
}
