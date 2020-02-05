import {PureComponent} from "react";
import {connect} from "react-redux";

import React from "react";

import {unreachable} from "../../../utils/reducer-utils";

import WaitForOtherPlayer from "../shared-components/wait-for-other-player";
import {Withdrawal} from "../withdrawing/container";

import {NonTerminalCloseLedgerChannelState} from "./states";

interface Props {
  state: NonTerminalCloseLedgerChannelState;
}

class CloseLedgerChannelContainer extends PureComponent<Props> {
  render() {
    const {state} = this.props;
    switch (state.type) {
      case "CloseLedgerChannel.WaitForConclude":
        return <WaitForOtherPlayer actionDescriptor="concluding" channelId={state.channelId} />;
      case "CloseLedgerChannel.WaitForWithdrawal":
        return <Withdrawal state={state.withdrawal} />;
      default:
        return unreachable(state);
    }
  }
}

export const CloseLedgerChannel = connect(
  () => ({}),
  () => ({})
)(CloseLedgerChannelContainer);
