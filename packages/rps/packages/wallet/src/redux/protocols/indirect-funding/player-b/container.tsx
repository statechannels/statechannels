import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { PlayerBState } from './state';
import { unreachable } from '../../../../utils/reducer-utils';
import { FundingStep } from './components/funding-step';

interface Props {
  state: PlayerBState;
}

class IndirectFundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'BWaitForPreFundSetup0':
      case 'BWaitForDirectFunding':
      case 'BWaitForPostFundSetup0':
      case 'BWaitForLedgerUpdate0':
        return <FundingStep indirectFundingStateB={state} />;
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
