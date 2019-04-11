import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import * as indirectFundingState from '../../redux/indirect-funding/state';
import { PlayerIndex } from '../../redux/types';
import { unreachable } from '../../utils/reducer-utils';
import IndirectFundingAContainer from './indirect-funding-a';
import IndirectFundingBContainer from './indirect-funding-b';

interface Props {
  state: indirectFundingState.IndirectFundingState;
}

class IndirectFundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;

    switch (state.player) {
      case PlayerIndex.A:
        return <IndirectFundingAContainer indirectFundingAState={state} />;
      case PlayerIndex.B:
        return <IndirectFundingBContainer indirectFundingBState={state} />;
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {};

export default connect(
  () => ({}),
  mapDispatchToProps,
)(IndirectFundingContainer);
