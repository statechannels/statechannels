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
  acknowledgeConcludingImpossible: (processId: string) => void;
  defund: (processId: string) => void;
  acknowledge: (processId: string) => void;
}

class ConcludingContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      deny,
      approve,
      acknowledgeConcludingImpossible,
      defund,
      acknowledge,
    } = this.props;
    const processId = state.processId;
    switch (state.type) {
      case 'AcknowledgeConcludingImpossible':
        return (
          <Acknowledge
            title="Concluding Not Possible"
            description="You must wait until it is your turn; or else challenge the other player if they are unresponsive."
            acknowledge={() => acknowledgeConcludingImpossible(state.processId)}
          />
        );
      case 'WaitForOpponentConclude':
        return <WaitForOpponentConclude />;
      case 'AcknowledgeChannelConcluded':
        return <ApproveDefunding approve={() => defund(processId)} />;
      case 'WaitForDefund':
        return <WaitForDefunding />;
      case 'ApproveConcluding':
        return (
          <ApproveConcluding deny={() => deny(processId)} approve={() => approve(processId)} />
        );
      case 'AcknowledgeDefundFailed':
        return (
          <Acknowledge
            title="Defunding failed"
            description="You weren't able to defund the channel"
            acknowledge={() => acknowledge(state.processId)}
          />
        );
      case 'AcknowledgeChannelDoesntExist':
        return (
          <Acknowledge
            title="Concluding failed"
            description="The channel does not exist."
            acknowledge={() => acknowledge(state.processId)}
          />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  approve: actions.concludeSent,
  deny: actions.cancelled,
  acknowledgeConcludingImpossible: actions.resignationImpossibleAcknowledged,
  defund: actions.defundChosen,
  acknowledge: actions.acknowledged,
};

export const Concluding = connect(
  () => ({}),
  mapDispatchToProps,
)(ConcludingContainer);
