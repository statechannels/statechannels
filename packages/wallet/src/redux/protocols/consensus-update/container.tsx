import * as states from './states';
import { PureComponent } from 'react';
import Failure from '../shared-components/failure';
import Success from '../shared-components/success';
import React from 'react';
import { connect } from 'react-redux';
import WaitForOtherPlayer from '../shared-components/wait-for-other-player';
import { unreachable } from '../../../utils/reducer-utils';

interface Props {
  state: states.ConsensusUpdateState;
}

class ConsensusUpdateContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'ConsensusUpdate.NotSafeToSend':
      case 'ConsensusUpdate.CommitmentSent':
        return (
          <WaitForOtherPlayer actionDescriptor={'consensus update'} channelId={state.channelId} />
        );
      case 'ConsensusUpdate.Failure':
        return <Failure name="consensus update" reason={state.reason} />;
      case 'ConsensusUpdate.Success':
        return <Success name="consensus update" />;
      default:
        return unreachable(state);
    }
  }
}
export const ConsensusUpdate = connect(
  () => ({}),
  () => ({}),
)(ConsensusUpdateContainer);
