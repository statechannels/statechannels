import * as states from './states';
import { PureComponent } from 'react';
import React from 'react';

import { connect } from 'react-redux';
import { unreachable } from '../../../utils/reducer-utils';
import { LedgerTopUp } from '../ledger-top-up/container';
import WaitForOtherPlayer from '../shared-components/wait-for-other-player';

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
        return <WaitForOtherPlayer actionDescriptor={'ledger update'} channelId={state.ledgerId} />;
      case 'ExistingLedgerFunding.Success':
      case 'ExistingLedgerFunding.Failure':
        return <div>{state.type}</div>;
      default:
        return unreachable(state);
    }
  }
}

export const ExistingLedgerFunding = connect(() => ({}))(ExistingLedgerFundingContainer);
