import {PureComponent} from "react";

import React from "react";

import {connect} from "react-redux";

import {isChallengerState, NonTerminalChallengerState} from "./challenger/states";
import {Challenger} from "./challenger/container";
import {NonTerminalResponderState} from "./responder/states";
import {Responder} from "./responder/container";

interface Props {
  state: NonTerminalResponderState | NonTerminalChallengerState;
}
class DisputeContainer extends PureComponent<Props> {
  render() {
    const {state} = this.props;
    if (isChallengerState(state)) {
      return <Challenger state={state} />;
    } else {
      return <Responder state={state} />;
    }
  }
}

export const Dispute = connect(() => ({}))(DisputeContainer);
