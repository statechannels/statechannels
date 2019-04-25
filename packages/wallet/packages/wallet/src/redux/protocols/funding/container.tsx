import * as states from './states';
import { PureComponent } from 'react';
import React from 'react';
import { Funding as PlayerAFunding } from './player-a';
import { Funding as PlayerBFunding } from './player-b';
import { connect } from 'react-redux';

interface Props {
  state: states.playerA.OngoingFundingState | states.playerB.OngoingFundingState;
}

class FundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    if (states.playerA.isFundingState(state)) {
      return <PlayerAFunding state={state} />;
    } else {
      return <PlayerBFunding state={state} />;
    }
  }
}

export const Funding = connect(() => ({}))(FundingContainer);
