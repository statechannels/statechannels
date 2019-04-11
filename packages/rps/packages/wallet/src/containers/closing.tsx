import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { Button } from 'reactstrap';

import * as states from '../redux/channel-state/state';
import * as actions from '../redux/actions';

import AcknowledgeX from '../components/acknowledge-x';
import ApproveX from '../components/approve-x';
import { unreachable } from '../utils/reducer-utils';
import WaitForOtherPlayer from '../components/wait-for-other-player';
// import WaitForXConfirmation from '../components/WaitForXConfirmation';
// import WaitForXInitiation from '../components/WaitForXInitiation';
import TransactionFailed from '../components/transaction-failed';
import SelectAddress from '../components/withdrawing/select-address';
import { ClosingStep } from '../components/closing/closing-step';
import EtherscanLink from '../components/etherscan-link';
import { WalletProtocol } from '../redux/types';
import Todo from '../components/todo';

interface Props {
  state: states.ClosingState;
  concludeApproved: () => void;
  concludeRejected: () => void;
  closeOnChain: (withdrawAddress: string) => void;
  closeSuccessAcknowledged: () => void;
  closedOnChainAcknowledged: () => void;
  retryTransaction: (channelId: string, protocol: WalletProtocol) => void;
}

class ClosingContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      concludeApproved,
      concludeRejected,
      closeSuccessAcknowledged,
      closedOnChainAcknowledged,
      closeOnChain,
      retryTransaction,
    } = this.props;

    switch (state.type) {
      case states.APPROVE_CONCLUDE:
        return (
          <ApproveX
            title="Conclude the game!"
            description="Do you wish to conclude this game?"
            approvalAction={concludeApproved}
            rejectionAction={concludeRejected}
            yesMessage="Conclude"
            noMessage="Cancel"
          />
        );
      case states.WAIT_FOR_OPPONENT_CONCLUDE:
        return <WaitForOtherPlayer name="conclude" />;
      case states.APPROVE_CLOSE_ON_CHAIN:
        // TODO: Add option to reject closing the channel?
        return (
          <SelectAddress
            approveAction={closeOnChain}
            title="Close and Withdraw"
            description="The game has been concluded! You can now close the channel and withdraw your funds."
            approveButtonTitle="Close and Withdraw"
          />
        );
      case states.ACKNOWLEDGE_CLOSE_SUCCESS:
        // return (
        //   <AcknowledgeX
        //     title="Channel closed!"
        //     action={closeSuccessAcknowledged}
        //     description="You have successfully closed your channel"
        //     actionTitle="Ok!"
        //   />
        // );
        return (
          <ClosingStep step={4}>
            <Button onClick={closeSuccessAcknowledged}>{'Return to app'}</Button>
          </ClosingStep>
        );
      case states.ACKNOWLEDGE_CLOSED_ON_CHAIN:
        return (
          <AcknowledgeX
            title="Channel closed on chain!"
            action={closedOnChainAcknowledged}
            description="You have successfully closed your channel on chain"
            actionTitle="Ok!"
          />
        );
      case states.WAIT_FOR_CLOSE_INITIATION:
        // return <WaitForXInitiation name="close" />;
        return <ClosingStep step={1} />;
      case states.WAIT_FOR_CLOSE_SUBMISSION:
        // return <WaitForXInitiation name="close" />;
        return <ClosingStep step={1} />;
      case states.WAIT_FOR_CLOSE_CONFIRMED:
        // return <WaitForXConfirmation name="close" transactionID={state.transactionHash} networkId={state.networkId} />;
        return (
          <ClosingStep step={2}>
            Check the progress on&nbsp;
            <EtherscanLink
              transactionID={state.transactionHash}
              networkId={-1} // TODO: Fix network id
              title="Etherscan"
            />
            !
          </ClosingStep>
        );
      case states.ACKNOWLEDGE_CONCLUDE:
        return (
          <AcknowledgeX
            title="Game Concluded!"
            action={concludeApproved}
            description="Your opponent has concluded the game!"
            actionTitle="Ok!"
          />
        );
      case states.CLOSE_TRANSACTION_FAILED:
        return (
          <TransactionFailed
            name="conclude"
            retryAction={() => retryTransaction(state.channelId, WalletProtocol.Closing)}
          />
        );
      case states.FINALIZED:
        return <Todo stateType={state.type} />;
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  concludeApproved: actions.channel.concludeApproved,
  concludeRejected: actions.channel.concludeRejected,
  closeSuccessAcknowledged: actions.channel.closeSuccessAcknowledged,
  closedOnChainAcknowledged: actions.channel.closedOnChainAcknowledged,
  closeOnChain: actions.channel.approveClose,
  retryTransaction: actions.retryTransaction,
};

export default connect(
  () => ({}),
  mapDispatchToProps,
)(ClosingContainer);
