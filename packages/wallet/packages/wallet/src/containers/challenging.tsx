import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { Button } from 'reactstrap';

import * as states from '../redux/channel-state/state';
import * as actions from '../redux/actions';

import ApproveX from '../components/approve-x';
import { unreachable } from '../utils/reducer-utils';
import TransactionFailed from '../components/transaction-failed';
import { ChallengingStep } from '../components/challenging/challenging-step';
import EtherscanLink from '../components/etherscan-link';
import { WalletProtocol } from '../redux/types';

interface Props {
  state: states.ChallengingState;
  timeoutAcknowledged: () => void;
  challengeResponseAcknowledged: () => void;
  challengeApproved: () => void;
  challengeRejected: () => void;
  retryTransaction: (channelId: string, protocol: WalletProtocol) => void;
}

class ChallengingContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      timeoutAcknowledged,
      challengeResponseAcknowledged,
      challengeApproved,
      challengeRejected,
      retryTransaction,
    } = this.props;

    switch (state.type) {
      case states.APPROVE_CHALLENGE:
        return (
          <ApproveX
            title="Launch a challenge!"
            description="You've selected to launch an on-chain challenge. Do you want to proceed?"
            approvalAction={challengeApproved}
            rejectionAction={challengeRejected}
            yesMessage="Launch challenge"
            noMessage="Cancel"
          />
        );
      case states.WAIT_FOR_CHALLENGE_INITIATION:
        return <ChallengingStep step={0} expirationTime={0} />;
      case states.WAIT_FOR_CHALLENGE_SUBMISSION:
        return (
          <ChallengingStep step={1} expirationTime={0}>
            Please confirm the transaction in MetaMask!
          </ChallengingStep>
        );
      case states.WAIT_FOR_CHALLENGE_CONFIRMATION:
        return (
          <ChallengingStep step={2} expirationTime={0}>
            Check the progress on&nbsp;
            <EtherscanLink
              transactionID={state.transactionHash}
              networkId={-1} // TODO: Fix network id
              title="Etherscan"
            />
            !
          </ChallengingStep>
        );
      case states.WAIT_FOR_RESPONSE_OR_TIMEOUT:
        return (
          <ChallengingStep
            step={3}
            expirationTime={state.challengeExpiry ? state.challengeExpiry : 0}
          />
        );
      case states.ACKNOWLEDGE_CHALLENGE_RESPONSE:
        return (
          <ChallengingStep step={777} expirationTime={0}>
            <Button onClick={challengeResponseAcknowledged}>{'Return to game'}</Button>
          </ChallengingStep>
        );
      case states.ACKNOWLEDGE_CHALLENGE_TIMEOUT:
        const parsedExpiryDate = new Date(state.challengeExpiry ? state.challengeExpiry * 1000 : 0)
          .toLocaleTimeString()
          .replace(/:\d\d /, ' ');
        const description = `The challenge expired at ${parsedExpiryDate}. You may now withdraw your funds.`;
        return (
          <ChallengingStep step={999} expirationTime={0}>
            {description}
            <br />
            <br />
            <Button onClick={timeoutAcknowledged}>{'Withdraw your funds'}</Button>
          </ChallengingStep>
        );
      case states.CHALLENGE_TRANSACTION_FAILED:
        return (
          <TransactionFailed
            name="challenge"
            retryAction={() => retryTransaction(state.channelId, WalletProtocol.Challenging)}
          />
        );

      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  timeoutAcknowledged: actions.channel.challengedTimedOutAcknowledged,
  challengeResponseAcknowledged: actions.channel.challengeResponseAcknowledged,
  challengeApproved: actions.channel.challengeApproved,
  challengeRejected: actions.channel.challengeRejected,
  retryTransaction: actions.retryTransaction,
};

export default connect(
  () => ({}),
  mapDispatchToProps,
)(ChallengingContainer);
