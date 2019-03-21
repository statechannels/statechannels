import React from 'react';
import * as states from '../../redux/fundingState/directFunding/state';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { faCircle } from '@fortawesome/free-regular-svg-icons';
import SidebarLayout from '../SidebarLayout';
import { unreachable } from '../../utils/reducer-utils';

interface Props {
  step: Step;
}

const completeIcon = (
  <span className="fa-li">
    <FontAwesomeIcon icon={faCheckCircle} color="green" size="lg" />
  </span>
);
const inProgressIcon = (
  <span className="fa-li">
    <FontAwesomeIcon icon={faSpinner} pulse={true} size="lg" />
  </span>
);
const todoIcon = (
  <span className="fa-li">
    <FontAwesomeIcon icon={faCircle} size="lg" />
  </span>
);

const icon = (iconStep: number, currentStep: number) => {
  if (currentStep < iconStep) {
    return todoIcon;
  } else if (currentStep === iconStep) {
    return inProgressIcon;
  } else {
    return completeIcon;
  }
};

export const fundingStepByState = (state: states.DirectFundingState): Step => {
  if (states.stateIsNotSafeToDeposit(state)) {
    return Step.NOT_SAFE_TO_DEPOSIT;
  }
  if (states.stateIsDepositing(state)) {
    if (state.depositStatus === states.depositing.WAIT_FOR_TRANSACTION_SENT) {
      return Step.SENDING_DEPOSIT;
    } else {
      return Step.CONFIRMING_DEPOSIT;
    }
  }
  if (states.stateIsWaitForFundingConfirmation(state)) {
    return Step.WAITING_FOR_FUNDING_CONFIRMATION;
  }
  if (states.stateIsChannelFunded(state)) {
    return Step.CHANNEL_FUNDED;
  }

  return unreachable(state);
};

export enum Step {
  NOT_SAFE_TO_DEPOSIT,
  SENDING_DEPOSIT,
  CONFIRMING_DEPOSIT,
  WAITING_FOR_FUNDING_CONFIRMATION,
  CHANNEL_FUNDED,
}

// NOTE: the appearance of this modal is largely influenced by the amount of text in each message. Until a more robust front-end comes along, try to keep messages of the same length within each case block below.
const message = (iconStep: Step, currentStep: Step) => {
  switch (iconStep) {
    case Step.NOT_SAFE_TO_DEPOSIT:
      if (currentStep < iconStep) {
        return "It's not safe to deposit yet";
      } else if (currentStep === iconStep) {
        return "Waiting for opponent's deposit...";
      } else {
        return "It's safe to deposit";
      }
    case Step.SENDING_DEPOSIT:
      if (currentStep < iconStep) {
        return 'Send your deposit';
      } else if (currentStep === iconStep) {
        return 'Sending your deposit...';
      } else {
        return 'Deposit sent';
      }
    case Step.CONFIRMING_DEPOSIT:
      if (currentStep < iconStep) {
        return 'Your deposit will be confirmed';
      } else if (currentStep === iconStep) {
        return 'Waiting for confirmation...';
      } else {
        return 'Deposit now confirmed';
      }
    case Step.WAITING_FOR_FUNDING_CONFIRMATION:
      if (currentStep < iconStep) {
        return "It's not safe to open the channel";
      } else if (currentStep === iconStep) {
        return "Waiting for opponent's deposit...";
      } else {
        return "It's safe to open the channel";
      }
    case Step.CHANNEL_FUNDED:
      if (currentStep < iconStep) {
        return 'The channel will be opened';
      } else if (currentStep === iconStep) {
        return 'Opening channel...';
      } else {
        return 'Channel open!';
      }
  }
};

export class FundingStep extends React.PureComponent<Props> {
  render() {
    const currentStep = this.props.step;
    const children = this.props.children;

    return (
      <SidebarLayout>
        <h2 className="bp-2">Opening channel</h2>
        <ul className="fa-ul">
          <li style={{ padding: '0.7em 1em' }}>
            {icon(Step.NOT_SAFE_TO_DEPOSIT, currentStep)}
            {message(Step.NOT_SAFE_TO_DEPOSIT, currentStep)}
          </li>
          <li style={{ padding: '0.7em 1em' }}>
            {icon(Step.SENDING_DEPOSIT, currentStep)}
            {message(Step.SENDING_DEPOSIT, currentStep)}
          </li>
          <li style={{ padding: '0.7em 1em' }}>
            {icon(Step.CONFIRMING_DEPOSIT, currentStep)}
            {message(Step.CONFIRMING_DEPOSIT, currentStep)}
          </li>
          <li style={{ padding: '0.7em 1em' }}>
            {icon(Step.WAITING_FOR_FUNDING_CONFIRMATION, currentStep)}
            {message(Step.WAITING_FOR_FUNDING_CONFIRMATION, currentStep)}
          </li>
          <li style={{ padding: '0.7em 1em' }}>
            {icon(Step.CHANNEL_FUNDED, currentStep)}
            {message(Step.CHANNEL_FUNDED, currentStep)}
          </li>
        </ul>
        <div className="pb-2">{children}</div>
      </SidebarLayout>
    );
  }
}
