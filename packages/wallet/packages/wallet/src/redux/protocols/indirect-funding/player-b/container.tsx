import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { PlayerBState } from './state';
import { unreachable } from '../../../../utils/reducer-utils';

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
        return <div>TODO Player B</div>;
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
