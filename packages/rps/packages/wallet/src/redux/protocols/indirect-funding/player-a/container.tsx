import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { PlayerAState } from './state';
import { unreachable } from '../../../../utils/reducer-utils';

interface Props {
  state: PlayerAState;
}

class IndirectFundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'AWaitForPreFundSetup1':
      case 'AWaitForDirectFunding':
      case 'AWaitForPostFundSetup1':
      case 'AWaitForLedgerUpdate1':
        return <div>TODO Player A</div>;
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
