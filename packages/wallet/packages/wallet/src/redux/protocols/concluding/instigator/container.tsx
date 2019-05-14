import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { InstigatorNonTerminalState as NonTerminalConcludingState } from './states';
import { unreachable } from '../../../../utils/reducer-utils';
import ApproveConcluding from './components/approve-concluding';
import ApproveDefunding from './components/approve-defunding';
import WaitForOpponentConclude from './components/wait-for-opponent-conclude';
import { Defunding } from '../../defunding/container';
import * as actions from './actions';
import Acknowledge from '../../shared-components/acknowledge';

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
      case 'InstigatorAcknowledgeSuccess':
        return (
          <Acknowledge
            title="Concluding Succesful"
            description="Your channel was closed and defunded."
            acknowledge={() => acknowledge(state.processId)}
          />
        );
      case 'InstigatorAcknowledgeFailure':
        return (
          <Acknowledge
            title="Concluding Failed"
            description={state.reason}
            acknowledge={() => acknowledge(state.processId)}
          />
        );
      case 'InstigatorWaitForOpponentConclude':
        return <WaitForOpponentConclude />;
      case 'InstigatorAcknowledgeConcludeReceived':
        return <ApproveDefunding approve={() => defund(processId)} />;
      case 'InstigatorWaitForDefund':
        return <Defunding state={state.defundingState} />;
      case 'InstigatorApproveConcluding':
        return (
          <ApproveConcluding deny={() => deny(processId)} approve={() => approve(processId)} />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  approve: actions.concludeApproved,
  deny: actions.cancelled,
  defund: actions.defundChosen,
  acknowledge: actions.acknowledged,
};

export const Concluding = connect(
  () => ({}),
  mapDispatchToProps,
)(ConcludingContainer);
