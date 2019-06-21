import * as states from './states';
import { PureComponent } from 'react';
import Failure from '../shared-components/failure';
import Success from '../shared-components/success';
import React from 'react';
import { connect } from 'react-redux';

interface Props {
  state: states.ConsensusUpdateState;
}

class ConsensusUpdateContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'ConsensusUpdate.WaitForUpdate':
        return <div>Waiting for ledger updates to be exchanged</div>;
      case 'ConsensusUpdate.Failure':
        return <Failure name="consensus update" reason={state.reason} />;
      case 'ConsensusUpdate.Success':
        return <Success name="consensus update" />;
    }
  }
}
export const ConsensusUpdate = connect(
  () => ({}),
  () => ({}),
)(ConsensusUpdateContainer);
