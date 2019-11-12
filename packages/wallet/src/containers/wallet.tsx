import React from "react";
import {PureComponent} from "react";
import {connect} from "react-redux";

import * as states from "../redux/state";
import LandingPage from "../components/landing-page";

interface WalletProps {
  state: states.WalletState;
  position: "left" | "center" | "right";
}

class WalletContainer extends PureComponent<WalletProps> {
  render() {
    const {state} = this.props;
    switch (state.type) {
      default:
        return <LandingPage />;
    }
  }
}

const mapStateToProps = (state: states.WalletState, ownProps?): WalletProps => ({
  state,
  position: ownProps.position
});

export default connect(mapStateToProps)(WalletContainer);
