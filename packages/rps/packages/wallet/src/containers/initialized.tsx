import * as states from '../redux/state';
import React, { PureComponent } from 'react';
import SidebarLayout from '../components/sidebar-layout';
import { connect } from 'react-redux';
import ChannelContainer from './channel';
interface Props {
  state: states.Initialized;
}

class WalletInitializedContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    if (state.channelState.activeAppChannelId) {
      return (
        <ChannelContainer
          state={state.channelState.initializedChannels[state.channelState.activeAppChannelId]}
        />
      );
    } else {
      return (
        <SidebarLayout>
          <h1>Wallet initialized</h1>
        </SidebarLayout>
      );
    }
  }
}

export default connect(() => ({}))(WalletInitializedContainer);
