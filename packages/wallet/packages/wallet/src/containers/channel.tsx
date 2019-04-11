import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as states from '../redux/channel-state/state';
import FundingContainer from './funding';
import RespondingContainer from './responding';
import ChallengingContainer from './challenging';
import WithdrawingContainer from './withdrawing';
import ClosingContainer from './closing';
import LandingPage from '../components/landing-page';

interface ChannelProps {
  state: states.ChannelStatus;
}

class ChannelContainer extends PureComponent<ChannelProps> {
  render() {
    const { state } = this.props;
    console.log(state);
    switch (state.stage) {
      case states.FUNDING:
        return <FundingContainer state={state} />;
      case states.CHALLENGING:
        return <ChallengingContainer state={state} />;
      case states.WITHDRAWING:
        return <WithdrawingContainer state={state} />;
      case states.RESPONDING:
        return <RespondingContainer state={state} />;
      case states.CLOSING:
        return <ClosingContainer state={state} />;
      default:
        return <LandingPage />;
    }
  }
}

export default connect(() => ({}))(ChannelContainer);
