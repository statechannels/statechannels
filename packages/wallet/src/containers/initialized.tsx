import React, {PureComponent} from "react";

import {connect} from "react-redux";

import * as states from "../redux/state";
import LandingPage from "../components/landing-page";

import * as selectors from "../redux/selectors";
import {Protocol} from "../redux/protocols/container";

interface Props {
  state: states.Initialized;
}

class WalletInitializedContainer extends PureComponent<Props> {
  render() {
    const {state} = this.props;
    if (!state.currentProcessId) {
      return <LandingPage />;
    } else {
      const protocolState = selectors.getProtocolState(state, state.currentProcessId);
      return <Protocol protocolState={protocolState} />;
    }
  }
}

export default connect(() => ({}))(WalletInitializedContainer);
