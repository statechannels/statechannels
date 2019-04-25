import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as actions from './actions';
import * as states from './states';

import { unreachable } from '../../../../utils/reducer-utils';
import { PlayerIndex } from '../../../types';
import { Strategy } from '..';

interface Props {
  state: states.OngoingFundingState;
  strategyChosen: (processId: string, strategy: Strategy) => void;
  strategyApproved: (processId: string, strategy: Strategy) => void;
  strategyRejected: (processId: string) => void;
  fundingSuccessAcknowledged: (processId: string) => void;
  cancelled: (processId: string, by: PlayerIndex) => void;
}

class FundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;

    switch (state.type) {
      case states.WAIT_FOR_STRATEGY_CHOICE:
      case states.WAIT_FOR_STRATEGY_RESPONSE:
      case states.WAIT_FOR_FUNDING:
      case states.WAIT_FOR_SUCCESS_CONFIRMATION:
        return <div>Hello World From Player A Funding</div>;
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  strategyChosen: actions.strategyChosen,
  strategyApproved: actions.strategyApproved,
  strategyRejected: actions.strategyRejected,
  fundingSuccessAcknowledged: actions.fundingSuccessAcknowledged,
  cancelled: actions.cancelled,
};

export const Funding = connect(
  () => ({}),
  mapDispatchToProps,
)(FundingContainer);
