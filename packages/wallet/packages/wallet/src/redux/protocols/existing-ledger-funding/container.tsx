import * as states from './states';
import { PureComponent } from 'react';
import React from 'react';

import { connect } from 'react-redux';
import { unreachable } from '../../../utils/reducer-utils';
import WaitForPostFundSetup from './components/wait-for-post-fund-setup';
import WaitForLedgerUpdate from './components/wait-for-ledger-update';
import { LedgerTopUp } from '../ledger-top-up/container';

interface Props {
  state: states.ExistingLedgerFundingState;
}

class ExistingLedgerFundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'ExistingLedgerFunding.WaitForLedgerTopUp':
        return <LedgerTopUp state={state.ledgerTopUpState} />;
      case 'ExistingLedgerFunding.WaitForLedgerUpdate':
        return <WaitForLedgerUpdate channelId={state.channelId} ledgerId={state.ledgerId} />;
      case 'ExistingLedgerFunding.WaitForPostFundSetup':
        return <WaitForPostFundSetup channelId={state.channelId} />;
      case 'ExistingLedgerFunding.Success':
      case 'ExistingLedgerFunding.Failure':
        return <div>{state.type}</div>;
      default:
        return unreachable(state);
    }
  }
}

export const ExistingLedgerFunding = connect(() => ({}))(ExistingLedgerFundingContainer);
