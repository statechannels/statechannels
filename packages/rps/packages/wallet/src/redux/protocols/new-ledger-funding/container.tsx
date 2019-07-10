import * as states from './states';
import { PureComponent } from 'react';
import React from 'react';

import { connect } from 'react-redux';
import { FundingStep } from './components/funding-step';
import { unreachable } from '../../../utils/reducer-utils';

interface Props {
  state: states.NonTerminalNewLedgerFundingState;
}

class NewLedgerFundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'NewLedgerFunding.WaitForPreFundSetup':
      case 'NewLedgerFunding.WaitForDirectFunding':
      case 'NewLedgerFunding.WaitForPostFundSetup':
      case 'NewLedgerFunding.WaitForLedgerUpdate':
        return <FundingStep newLedgerFundingState={state} />;
      default:
        return unreachable(state);
    }
  }
}

export const NewLedgerFunding = connect(() => ({}))(NewLedgerFundingContainer);
