import * as states from './states';
import { PureComponent } from 'react';
import { Withdrawal } from '../withdrawing/container';
import React from 'react';
import Failure from '../shared-components/failure';
import Success from '../shared-components/success';
import { connect } from 'react-redux';
import { IndirectDefunding } from '../indirect-defunding/container';

interface Props {
  state: states.DefundingState;
}

class DefundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case states.WAIT_FOR_WITHDRAWAL:
        return <Withdrawal state={state.withdrawalState} />;
      case states.WAIT_FOR_INDIRECT_DEFUNDING:
        return <IndirectDefunding state={state.indirectDefundingState} />;
      case states.FAILURE:
        return <Failure name="de-funding" reason={state.reason} />;
      case states.SUCCESS:
        return <Success name="de-funding" />;
    }
  }
}
export const Defunding = connect(
  () => ({}),
  () => ({}),
)(DefundingContainer);
