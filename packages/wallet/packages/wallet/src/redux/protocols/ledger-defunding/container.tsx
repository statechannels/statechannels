import * as states from './states';
import { PureComponent } from 'react';
import React from 'react';
import Failure from '../shared-components/failure';
import Success from '../shared-components/success';
import { connect } from 'react-redux';
import { unreachable } from '../../../utils/reducer-utils';
import WaitForOtherPlayer from '../shared-components/wait-for-other-player';

interface Props {
  state: states.LedgerDefundingState;
}

class LedgerDefundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'LedgerDefunding.WaitForLedgerUpdate':
        return (
          <WaitForOtherPlayer
            actionDescriptor={'ledger channel update'}
            channelId={state.ledgerId}
          />
        );
      case 'LedgerDefunding.Failure':
        return <Failure name="ledger-de-funding" reason={state.reason} />;
      case 'LedgerDefunding.Success':
        return <Success name="ledger-de-funding" />;
      default:
        return unreachable(state);
    }
  }
}
export const LedgerDefunding = connect(
  () => ({}),
  () => ({}),
)(LedgerDefundingContainer);
