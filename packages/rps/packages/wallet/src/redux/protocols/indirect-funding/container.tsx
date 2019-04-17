import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import * as indirectFundingState from './state';
import { PlayerIndex } from '../../types';
import { unreachable } from '../../../utils/reducer-utils';
import IndirectFundingAContainer from './player-a/container';
import IndirectFundingBContainer from './player-b/container';

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
