import * as states from './states';
import { PureComponent } from 'react';
import React from 'react';

import { connect } from 'react-redux';
import { unreachable } from '../../../utils/reducer-utils';
import WaitForOtherPlayer from '../shared-components/wait-for-other-player';

interface Props {
  state: states.NonTerminalVirtualDefundingState;
}

class VirtualDefundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'VirtualDefunding.WaitForJointChannelUpdate':
        return (
          <WaitForOtherPlayer
            actionDescriptor={'joint channel update'}
            channelId={state.jointChannelId}
          />
        );
      case 'VirtualDefunding.WaitForLedgerChannelUpdate':
        return (
          <WaitForOtherPlayer
            actionDescriptor={'ledger channel update'}
            channelId={state.ledgerChannelId}
          />
        );

      default:
        return unreachable(state);
    }
  }
}
export const VirtualDefunding = connect(
  () => ({}),
  () => ({}),
)(VirtualDefundingContainer);
