import { PureComponent } from 'react';
import React from 'react';

import { connect } from 'react-redux';
import { unreachable } from '../../../utils/reducer-utils';
import { LedgerTopUpState } from './states';
import { ConsensusUpdate } from '../consensus-update/container';
import { DirectFunding } from '../direct-funding/container';

interface Props {
  state: LedgerTopUpState;
}

class LedgerTopUpContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'LedgerTopUp.SwitchOrderAndAddATopUpUpdate':
      case 'LedgerTopUp.RestoreOrderAndAddBTopUpUpdate':
        return <ConsensusUpdate state={state.consensusUpdateState} />;
      case 'LedgerTopUp.WaitForDirectFundingForA':
      case 'LedgerTopUp.WaitForDirectFundingForB':
        return <DirectFunding state={state.directFundingState} />;
      case 'LedgerTopUp.Success':
      case 'LedgerTopUp.Failure':
        return <div>{state.type}</div>;
      default:
        return unreachable(state);
    }
  }
}

export const LedgerTopUp = connect(() => ({}))(LedgerTopUpContainer);
