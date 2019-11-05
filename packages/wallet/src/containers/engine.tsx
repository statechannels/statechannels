import React from "react";
import {PureComponent} from "react";
import {connect} from "react-redux";

import * as states from "../redux/state";
import MetamaskErrorContainer from "./metamask-error";
import EngineInitializedContainer from "./initialized";
import LandingPage from "../components/landing-page";
import Modal from "react-modal";
import StatusBarLayout from "../components/status-bar-layout";

interface EngineProps {
  state: states.EngineState;
  position: "left" | "center" | "right";
}

class EngineContainer extends PureComponent<EngineProps> {
  render() {
    const {state} = this.props;
    switch (state.type) {
      case states.WAIT_FOR_LOGIN:
      case states.METAMASK_ERROR:
        return (
          <Modal
            isOpen={true}
            className={"engine-content-" + this.props.position}
            overlayClassName={"engine-overlay-" + this.props.position}
            ariaHideApp={false}
          >
            <StatusBarLayout>
              <MetamaskErrorContainer state={state} />
            </StatusBarLayout>
          </Modal>
        );
      case states.ENGINE_INITIALIZED:
        return (
          <Modal
            isOpen={true}
            className={"engine-content-" + this.props.position}
            overlayClassName={"engine-overlay-" + this.props.position}
            ariaHideApp={false}
          >
            <StatusBarLayout>
              <EngineInitializedContainer state={state} />
            </StatusBarLayout>
          </Modal>
        );
      default:
        return <LandingPage />;
    }
  }
}

const mapStateToProps = (state: states.EngineState, ownProps?): EngineProps => ({
  state,
  position: ownProps.position
});

export default connect(mapStateToProps)(EngineContainer);
