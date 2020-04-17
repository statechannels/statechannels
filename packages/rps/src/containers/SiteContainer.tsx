import React from 'react';

import ApplicationContainer from './ApplicationContainer';
import HomePageContainer from './HomePageContainer';
import {connect} from 'react-redux';
import {SiteState} from '../redux/reducer';
import {WalletError} from '../redux/wallet/actions';

interface SiteProps {
  isAuthenticated: boolean;
  walletError: WalletError | null;
}

class Site extends React.PureComponent<SiteProps> {
  walletDiv: React.RefObject<any>;
  constructor(props) {
    super(props);
    this.walletDiv = React.createRef();
  }

  render() {
    let component;

    if (this.props.walletError !== null) {
      component = <code>{JSON.stringify(this.props.walletError, null, 2)}</code>;
    } else if (this.props.isAuthenticated) {
      component = <ApplicationContainer />;
    } else {
      component = <HomePageContainer />;
    }

    return (
      <div className="w-100">
        <div ref={this.walletDiv} />
        {component}
      </div>
    );
  }
}

const mapStateToProps = (state: SiteState) => {
  return {
    isAuthenticated: state.login && state.login.loggedIn,
    walletError: state.wallet.error,
    walletVisible: state.overlay.walletVisible,
  };
};

export default connect(mapStateToProps)(Site);
