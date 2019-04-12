import React from 'react';
import * as indirectFundingPlayerA from '../../redux/protocols/indirect-funding/player-a/state';
import * as indirectFundingPlayerB from '../../redux/protocols/indirect-funding/player-b/state';
import * as indirectFunding from '../../redux/protocols/indirect-funding/state';
import { unreachable } from '../../utils/reducer-utils';
import StatusBarLayout from '../status-bar-layout';
import { icon, message, MessagesForStep, messagesForStep } from '../list-util';

interface Props {
  fundingState: indirectFunding.IndirectFundingState;
}

const fundingStepByState = (state: indirectFunding.IndirectFundingState): Step => {
  switch (state.type) {
    case indirectFundingPlayerA.WAIT_FOR_APPROVAL:
    case indirectFundingPlayerB.WAIT_FOR_APPROVAL:
    case indirectFundingPlayerA.WAIT_FOR_PRE_FUND_SETUP_1:
    case indirectFundingPlayerB.WAIT_FOR_PRE_FUND_SETUP_0:
      return Step.WAIT_FOR_PRE_FUND_SETUP;
    case indirectFundingPlayerA.WAIT_FOR_DIRECT_FUNDING:
    case indirectFundingPlayerB.WAIT_FOR_DIRECT_FUNDING:
    case indirectFundingPlayerA.WAIT_FOR_POST_FUND_SETUP_1:
    case indirectFundingPlayerB.WAIT_FOR_POST_FUND_SETUP_0:
      return Step.WAIT_FOR_POST_FUND_SETUP;
    case indirectFundingPlayerA.WAIT_FOR_LEDGER_UPDATE_1:
    case indirectFundingPlayerB.WAIT_FOR_LEDGER_UPDATE_0:
      return Step.WAIT_FOR_LEDGER_UPDATE;
    case indirectFundingPlayerA.WAIT_FOR_LEDGER_UPDATE_1:
    case indirectFundingPlayerB.WAIT_FOR_LEDGER_UPDATE_0:
      return Step.WAIT_FOR_LEDGER_UPDATE;
    case indirectFundingPlayerB.WAIT_FOR_CONSENSUS:
      return Step.WAIT_FOR_CONSENSUS;
    default:
      return unreachable(state);
  }
};

export enum Step {
  WAIT_FOR_PRE_FUND_SETUP,
  WAIT_FOR_DIRECT_FUNDING,
  WAIT_FOR_POST_FUND_SETUP,
  WAIT_FOR_LEDGER_UPDATE,
  WAIT_FOR_CONSENSUS,
}

const stepMessages: MessagesForStep[] = [
  messagesForStep(
    'Not ready for prefund setup',
    'Waiting for opponent prefund setup',
    'Received opponent prefund setup',
  ),
  messagesForStep(
    'Not ready for ledger direct funding',
    'Waiting for opponent prefund setup',
    'Ledger channel directly funded',
  ),
  messagesForStep(
    'Not ready for postfund setup',
    'Waiting for opponent postfund setup',
    'Received opponent postfund setup',
  ),
  messagesForStep(
    'Not ready to allocate from ledger channel',
    'Waiting for opponent ledger channel update',
    'Received opponent postfund setup',
  ),
  messagesForStep(
    'Not ready for consensus commitment ledger channel',
    'Waiting for consensus commitment',
    'Received consensus commitment',
  ),
];

export class FundingStep extends React.PureComponent<Props> {
  render() {
    const fundingState = this.props.fundingState;
    const children = this.props.children;
    const currentStep = fundingStepByState(fundingState);

    return (
      <StatusBarLayout>
        <h2 className="bp-2">Opening ledger channel</h2>
        <ul className="fa-ul">
          {stepMessages.map((stepMessage, stepIndex) => (
            <li key={stepIndex}>
              {icon(stepIndex, currentStep)}
              {message(stepMessages, stepIndex, currentStep)}
            </li>
          ))}
        </ul>
        <div className="pb-2">{children}</div>
      </StatusBarLayout>
    );
  }
}
