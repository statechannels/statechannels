import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as states from '../redux/states/channels';
import FundingContainer from './Funding';
import RespondingContainer from './Responding';
import ChallengingContainer from './Challenging';
import WithdrawingContainer from './Withdrawing';
import ClosingContainer from './Closing';
import LandingPage from '../components/LandingPage';

interface ChannelProps {
  state: states.ChannelState;
}

class ChannelContainer extends PureComponent<ChannelProps> {
  render() {
    const { state } = this.props;
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
