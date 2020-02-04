import {PureComponent} from "react";
import React from "react";

import {connect} from "react-redux";

import Failure from "../shared-components/failure";
import Success from "../shared-components/success";
import {LedgerDefunding} from "../ledger-defunding/container";
import {unreachable} from "../../../utils/reducer-utils";
import {VirtualDefunding} from "../virtual-defunding/container";

import * as states from "./states";

interface Props {
  state: states.DefundingState;
}

class DefundingContainer extends PureComponent<Props> {
  render() {
    const {state} = this.props;
    switch (state.type) {
      case "Defunding.WaitForLedgerDefunding":
        return <LedgerDefunding state={state.ledgerDefundingState} />;
      case "Defunding.Failure":
        return <Failure name="de-funding" reason={state.reason} />;
      case "Defunding.Success":
        return <Success name="de-funding" />;
      case "Defunding.WaitForVirtualDefunding":
        return <VirtualDefunding state={state.virtualDefunding} />;
      default:
        return unreachable(state);
    }
  }
}
export const Defunding = connect(
  () => ({}),
  () => ({})
)(DefundingContainer);
