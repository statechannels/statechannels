import * as states from './states';
import { PureComponent } from 'react';
import React from 'react';

import { connect } from 'react-redux';
import { ExistingLedgerFunding } from '../existing-ledger-funding/container';
import { NewLedgerChannel } from '../new-ledger-channel/container';

interface Props {
  state: states.NonTerminalIndirectFundingState;
}

class IndirectFundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    if (state.type === 'IndirectFunding.WaitForExistingLedgerFunding') {
      return <ExistingLedgerFunding state={state.existingLedgerFundingState} />;
    } else {
      return <NewLedgerChannel state={state.newLedgerChannel} />;
    }
  }
}

export const IndirectFunding = connect(() => ({}))(IndirectFundingContainer);
