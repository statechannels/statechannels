import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { ResponderNonTerminalState as NonTerminalConcludingState } from './states';
import { unreachable } from '../../../../utils/reducer-utils';
import ApproveConcluding from './components/approve-concluding';
import ApproveDefunding from './components/approve-defunding';
import { Defunding } from '../../defunding/container';
import * as actions from './actions';
import Acknowledge from '../../shared-components/acknowledge';

interface Props {
  state: NonTerminalConcludingState;
  approve: (processId: string) => void;
  defund: (processId: string) => void;
  acknowledge: (processId: string) => void;
}

class ConcludingContainer extends PureComponent<Props> {
  render() {
    const { state, approve, defund, acknowledge } = this.props;
    const processId = state.processId;
    switch (state.type) {
      case 'ResponderAcknowledgeSuccess':
        return (
          <Acknowledge
            title="Concluding Succesful"
            description="Your channel was closed and defunded."
            acknowledge={() => acknowledge(state.processId)}
          />
        );
      case 'ResponderAcknowledgeFailure':
        return (
          <Acknowledge
            title="Concluding Failed"
            description={state.reason}
            acknowledge={() => acknowledge(state.processId)}
          />
        );
      case 'ResponderDecideDefund':
        return <ApproveDefunding approve={() => defund(processId)} />;
      case 'ResponderWaitForDefund':
        return <Defunding state={state.defundingState} />;
      case 'ResponderApproveConcluding':
        return <ApproveConcluding approve={() => approve(processId)} />;
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  approve: actions.concludeApproved,
  defund: actions.defundChosen,
  acknowledge: actions.acknowledged,
};

export const Concluding = connect(
  () => ({}),
  mapDispatchToProps,
)(ConcludingContainer);
