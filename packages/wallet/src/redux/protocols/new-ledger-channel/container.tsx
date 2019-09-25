import * as states from './states';
import { PureComponent } from 'react';
import React from 'react';

import { connect } from 'react-redux';
import { FundingStep } from './components/funding-step';
import { unreachable } from '../../../utils/reducer-utils';

interface Props {
  state: states.NonTerminalNewLedgerChannelState;
}

class NewLedgerChannelContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'NewLedgerChannel.WaitForPreFundSetup':
      case 'NewLedgerChannel.WaitForDirectFunding':
      case 'NewLedgerChannel.WaitForPostFundSetup':
        return <FundingStep NewLedgerChannelState={state} />;
      default:
        return unreachable(state);
    }
  }
}

export const NewLedgerChannel = connect(() => ({}))(NewLedgerChannelContainer);
