import React from "react";
import {PureComponent} from "react";
import {connect} from "react-redux";
import {NonTerminalConcludingState} from ".";
import WaitForOtherPlayer from "../shared-components/wait-for-other-player";
import {unreachable} from "../../../utils/reducer-utils";
import ApproveX from "../shared-components/approve-x";
import * as actions from "./actions";
import {CloseLedgerChannel} from "../close-ledger-channel/container";
interface Props {
  state: NonTerminalConcludingState;
  keepOpenSelected: typeof actions.keepOpenSelected;
  closeSelected: typeof actions.closeSelected;
}

class ConcludingContainer extends PureComponent<Props> {
  render() {
    const {state, keepOpenSelected, closeSelected} = this.props;
    switch (state.type) {
      case "Concluding.WaitForConclude":
        return <WaitForOtherPlayer actionDescriptor={"conclude"} channelId={state.channelId} />;
      case "Concluding.WaitForDefund":
        return <WaitForOtherPlayer actionDescriptor={"defund"} channelId={state.channelId} />;
      case "Concluding.WaitForLedgerClose":
        return <CloseLedgerChannel state={state.ledgerClosing} />;
      case "Concluding.DecideClosing":
        const {processId} = state;
        return (
          <ApproveX
            title="Close Channel?"
            yesMessage="Close Channel"
            noMessage="Keep Open"
            description="Do you want to close your channel?"
            approvalAction={() => closeSelected({processId})}
            rejectionAction={() => keepOpenSelected({processId})}
          />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  closeSelected: actions.closeSelected,
  keepOpenSelected: actions.keepOpenSelected
};
export const Concluding = connect(() => ({}), mapDispatchToProps)(ConcludingContainer);
