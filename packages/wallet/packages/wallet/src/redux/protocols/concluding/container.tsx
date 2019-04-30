import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { NonTerminalState as NonTerminalConcludingState } from './states';
import { unreachable } from '../../../utils/reducer-utils';
import ApproveConcluding from './components/approve-concluding';
import ApproveDefunding from './components/approve-defunding';
import WaitForOpponentConclude from './components/wait-for-opponent-conclude';
import WaitForDefunding from './components/wait-for-defunding';
import * as actions from './actions';
import Acknowledge from '../shared-components/acknowledge';

interface Props {
  state: NonTerminalConcludingState;
  approve: (processId: string) => void;
  deny: (processId: string) => void;
  defund: (processId: string) => void;
  acknowledge: (processId: string) => void;
}

class ConcludingContainer extends PureComponent<Props> {
  render() {
    const { state, deny, approve, defund, acknowledge } = this.props;
    const processId = state.processId;
    switch (state.type) {
      case 'AcknowledgeSuccess':
        return (
          <Acknowledge
            title="Concluding Succesful"
            description="Your channel was closed and defunded."
            acknowledge={() => acknowledge(state.processId)}
          />
        );
      case 'AcknowledgeFailure':
        return (
          <Acknowledge
            title="Concluding Failed"
            description={state.reason}
            acknowledge={() => acknowledge(state.processId)}
          />
        );
      case 'WaitForOpponentConclude':
        return <WaitForOpponentConclude />;
      case 'AcknowledgeConcludeReceived':
        return <ApproveDefunding approve={() => defund(processId)} />;
      case 'WaitForDefund':
        return <WaitForDefunding />;
      case 'ApproveConcluding':
        return (
          <ApproveConcluding deny={() => deny(processId)} approve={() => approve(processId)} />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  approve: actions.concludeSent,
  deny: actions.cancelled,
  defund: actions.defundChosen,
  acknowledge: actions.acknowledged,
};

export const Concluding = connect(
  () => ({}),
  mapDispatchToProps,
)(ConcludingContainer);
