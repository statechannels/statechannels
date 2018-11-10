import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import { WalletState } from '../redux/reducers';
import { SiteState } from '../../redux/reducer';
import WalletContents from './WalletContents';
import SidebarLayout from '../components/SidebarLayout';
import FooterLayout from './WalletFooter';

interface WalletProps {
  state: WalletState;
}

class Wallet extends PureComponent<WalletProps> {

  render() {
    const { showWallet, showFooter } = this.props.state.display;

    if (showWallet) {
      return (
        <SidebarLayout contents={<WalletContents />}>
          {this.props.children}
        </SidebarLayout>
      );
    } else if (showFooter) {
      return (
        <FooterLayout>
          {this.props.children}
        </FooterLayout>
      );
    } else {
      return this.props.children;
    }
  }
}

const mapStateToProps = (state: SiteState): WalletProps => ({
  state: state.wallet,
});

export default connect(mapStateToProps)(Wallet);
