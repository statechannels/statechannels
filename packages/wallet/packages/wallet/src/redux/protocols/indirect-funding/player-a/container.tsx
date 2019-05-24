import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { PlayerAState } from './states';
import { unreachable } from '../../../../utils/reducer-utils';
import { FundingStep } from './components/funding-step';

interface Props {
  state: PlayerAState;
}

class IndirectFundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'IndirectFunding.AWaitForPreFundSetup1':
      case 'IndirectFunding.AWaitForDirectFunding':
      case 'IndirectFunding.AWaitForPostFundSetup1':
      case 'IndirectFunding.AWaitForLedgerUpdate1':
        return <FundingStep indirectFundingStateA={state} />;
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {};

export const IndirectFunding = connect(
  () => ({}),
  mapDispatchToProps,
)(IndirectFundingContainer);
