import * as states from '../redux/states';
import React, { PureComponent } from 'react';
import SidebarLayout from '../components/SidebarLayout';
import LandingPage from '../components/LandingPage';
import { connect } from 'react-redux';
import ChannelContainer from './Channel';
interface Props {
  state: states.InitializedState;
}

class WalletInitializedContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case states.WAITING_FOR_CHANNEL_INITIALIZATION:
        return (
          <SidebarLayout>
            <h1>Waiting for channel initialization</h1>
          </SidebarLayout>
        );
      case states.INITIALIZING_CHANNEL:
        return (
          <SidebarLayout>
            <h1>Channel initializing.</h1>
          </SidebarLayout>
        );
      case states.CHANNEL_INITIALIZED:
        return <ChannelContainer state={state.channelState} />;
      default:
        return <LandingPage />;
    }
  }
}

export default connect(() => ({}))(WalletInitializedContainer);
