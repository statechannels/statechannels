import {PureComponent} from "react";

import React from "react";

import {connect} from "react-redux";

import * as states from "./states";

import {FundingStrategyNegotiation as PlayerA} from "./player-a";
import {FundingStrategyNegotiation as PlayerB} from "./player-b";

interface Props {
  state:
    | states.playerA.OngoingFundingStrategyNegotiationState
    | states.playerB.OngoingFundingStrategyNegotiationState;
}

class FundingStrategyNegotiationContainer extends PureComponent<Props> {
  render() {
    const {state} = this.props;
    if (states.playerA.isFundingStrategyNegotiationState(state)) {
      return <PlayerA state={state} />;
    } else {
      return <PlayerB state={state} />;
    }
  }
}

export const FundingStrategyNegotiation = connect(() => ({}))(FundingStrategyNegotiationContainer);
