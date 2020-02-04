import React from "react";
import {PureComponent} from "react";
import {connect} from "react-redux";
import {Modal, Card} from "rimble-ui";

import * as states from "../redux/state";

import WalletInitializedContainer from "./initialized";

interface WalletProps {
  state: states.WalletState;
  position: "left" | "center" | "right";
}

class WalletContainer extends PureComponent<WalletProps> {
  render() {
    const {state} = this.props;
    return (
      <Modal isOpen={true}>
        <Card width={"320px"} height={"450px"}>
          <WalletInitializedContainer state={state} />
        </Card>
      </Modal>
    );
  }
}

const mapStateToProps = (state: states.WalletState, ownProps?): WalletProps => ({
  state,
  position: ownProps.position
});

export default connect(mapStateToProps)(WalletContainer);
