import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { PlayerAState } from './states';
import { unreachable } from '../../../../utils/reducer-utils';
import { FundingStep } from './components/funding-step';

interface Props {
  state: PlayerAState;
}

class NewLedgerFundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'NewLedgerFunding.AWaitForPreFundSetup1':
      case 'NewLedgerFunding.AWaitForDirectFunding':
      case 'NewLedgerFunding.AWaitForPostFundSetup1':
      case 'NewLedgerFunding.AWaitForLedgerUpdate1':
        return <FundingStep newLedgerFundingStateA={state} />;
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {};

export const NewLedgerFunding = connect(
  () => ({}),
  mapDispatchToProps,
)(NewLedgerFundingContainer);
