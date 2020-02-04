import React from "react";
import {PureComponent} from "react";
import {connect} from "react-redux";

import {Dispute} from "../dispute/container";

import {unreachable} from "../../../utils/reducer-utils";
import {isNonTerminalDisputeState} from "../dispute/state";

import * as states from "./states";

interface Props {
  state: states.ApplicationState;
}

class ApplicationContainer extends PureComponent<Props> {
  render() {
    const {state} = this.props;

    switch (state.type) {
      case "Application.WaitForDispute":
        if (isNonTerminalDisputeState(state.disputeState)) {
          return <Dispute state={state.disputeState} />;
        }
        return <div />;
      case "Application.Ongoing":
      case "Application.Success":
      case "Application.WaitForFirstState":
        return <div />;
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {};

export const Application = connect(() => ({}), mapDispatchToProps)(ApplicationContainer);
