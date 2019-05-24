import * as states from './states';
import { PureComponent } from 'react';
import React from 'react';
import Failure from '../shared-components/failure';
import Success from '../shared-components/success';
import { connect } from 'react-redux';
import WaitForLedgerUpdate from './components/wait-for-ledger-update';
import { unreachable } from '../../../utils/reducer-utils';
import WaitForLedgerConclude from './components/wait-for-ledger-conclude';

interface Props {
  state: states.IndirectDefundingState;
}

class IndirectDefundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'IndirectDefunding.WaitForLedgerUpdate':
        return <WaitForLedgerUpdate ledgerId={state.ledgerId} />;
      case 'IndirectDefunding.WaitForConclude':
        return <WaitForLedgerConclude ledgerId={state.ledgerId} />;
      case 'IndirectDefunding.Failure':
        return <Failure name="indirect-de-funding" reason={state.reason} />;
      case 'IndirectDefunding.Success':
        return <Success name="indirect-de-funding" />;
      default:
        return unreachable(state);
    }
  }
}
export const IndirectDefunding = connect(
  () => ({}),
  () => ({}),
)(IndirectDefundingContainer);
