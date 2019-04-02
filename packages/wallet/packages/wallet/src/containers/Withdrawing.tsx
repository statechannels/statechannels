import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { Button } from 'reactstrap';

import * as states from '../redux/channelState/state';
import * as actions from '../redux/actions';

// import AcknowledgeX from '../components/AcknowledgeX';
// import WaitForXConfirmation from '../components/WaitForXConfirmation';
// import WaitForXInitiation from '../components/WaitForXInitiation';
import { unreachable } from '../utils/reducer-utils';
import TransactionFailed from '../components/TransactionFailed';
import SelectAddress from '../components/withdrawing/SelectAddress';
import { WithdrawingStep } from '../components/withdrawing/WithdrawingStep';
import EtherscanLink from '../components/EtherscanLink';
import { WalletProcedure } from '../redux/types';

interface Props {
  state: states.WithdrawingState;
  withdrawalApproved: (destinationAddress: string) => void;
  withdrawalRejected: () => void;
  withdrawalSuccessAcknowledged: () => void;
  retryTransaction: (channelId: string, procedure: WalletProcedure) => void;
}

class WithdrawingContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      withdrawalApproved,
      withdrawalSuccessAcknowledged,
      retryTransaction,
    } = this.props;

    switch (state.type) {
      case states.APPROVE_WITHDRAWAL:
        return (
          <SelectAddress
            approveAction={withdrawalApproved}
            title="Withdraw"
            description="Do you wish to withdraw your funds from this channel?"
            approveButtonTitle="Withdraw"
          />
        );
      case states.WAIT_FOR_WITHDRAWAL_INITIATION:
        // return <WaitForXInitiation name="withdrawal" />;
        return (
          <WithdrawingStep step={1}> Please confirm the transaction in MetaMask!</WithdrawingStep>
        );
      case states.WAIT_FOR_WITHDRAWAL_CONFIRMATION:
        // return <WaitForXConfirmation name="withdrawal" transactionID={state.transactionHash} networkId={state.networkId} />;
        return (
          <WithdrawingStep step={2}>
            Check the progress on&nbsp;
            <EtherscanLink
              transactionID={state.transactionHash}
              networkId={-1} // TODO: Put in network id
              title="Etherscan"
            />
            !
          </WithdrawingStep>
        );
      case states.ACKNOWLEDGE_WITHDRAWAL_SUCCESS:
        // return (
        //   <AcknowledgeX
        //     title="Withdrawal successful!"
        //     description="You have successfully withdrawn your funds."
        //     action={withdrawalSuccessAcknowledged}
        //     actionTitle="Return to app"
        //   />
        // );
        return (
          <WithdrawingStep step={4}>
            <Button onClick={withdrawalSuccessAcknowledged}>{'Return to app'}</Button>
          </WithdrawingStep>
        );
      case states.WITHDRAW_TRANSACTION_FAILED:
        return (
          <TransactionFailed
            name="withdraw"
            retryAction={() => retryTransaction(state.channelId, WalletProcedure.Withdrawing)}
          />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  withdrawalApproved: actions.channel.withdrawalApproved,
  withdrawalRejected: actions.channel.withdrawalRejected,
  withdrawalSuccessAcknowledged: actions.channel.withdrawalSuccessAcknowledged,
  retryTransaction: actions.retryTransaction,
};

// why does it think that mapStateToProps can return undefined??

export default connect(
  () => ({}),
  mapDispatchToProps,
)(WithdrawingContainer);
