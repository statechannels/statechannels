import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { ResponderNonTerminalState as NonTerminalConcludingState } from './states';
import { unreachable } from '../../../../utils/reducer-utils';
import * as actions from './actions';
import Acknowledge from '../../shared-components/acknowledge';
import { ConsensusUpdate } from '../../consensus-update/container';
import { defundRequested } from '../../actions';
import { multipleWalletActions } from '../../../../redux/actions';
import ApproveX from '../../shared-components/approve-x';
import WaitForOtherPlayer from '../../shared-components/wait-for-other-player';

interface Props {
  state: NonTerminalConcludingState;
  approve: typeof actions.concludeApproved;
  defund: typeof defundRequestedAndDefundChosen;
  keepOpen: typeof actions.keepOpenChosen;
  acknowledge: typeof actions.acknowledged;
}

class ConcludingContainer extends PureComponent<Props> {
  render() {
    const { state, approve, defund, keepOpen, acknowledge } = this.props;
    const processId = state.processId;
    switch (state.type) {
      case 'ConcludingResponder.AcknowledgeSuccess':
        return (
          <Acknowledge
            title="Concluding Succesful"
            description="Your channel was closed and defunded."
            acknowledge={() => acknowledge({ processId })}
          />
        );
      case 'ConcludingResponder.AcknowledgeFailure':
        return (
          <Acknowledge
            title="Concluding Failed"
            description={state.reason}
            acknowledge={() => acknowledge({ processId })}
          />
        );
      case 'ConcludingResponder.DecideDefund':
        return (
          <ApproveX
            title={'Channel concluded'}
            description={'Do you want to keep your ledger channel open, or defund it?'}
            yesMessage={'Keep open'}
            noMessage={'Defund'}
            rejectionAction={() => defund(processId, state.channelId)}
            approvalAction={() => keepOpen({ processId })}
          />
        );
      case 'ConcludingResponder.ApproveConcluding':
        return (
          <ApproveX
            title={'Approve concluding this channel'}
            description={
              'Do you want to conclude this channel? Your opponent instigated this process'
            }
            yesMessage={'Conclude'}
            noMessage={''}
            rejectionAction={() => null}
            approvalAction={() => approve({ processId })}
          />
        );
      case 'ConcludingResponder.WaitForLedgerUpdate':
        return <ConsensusUpdate state={state.consensusUpdateState} />;
      case 'ConcludingResponder.WaitForOpponentSelection':
        return (
          <WaitForOtherPlayer
            actionDescriptor={'decision about defunding'}
            channelId={state.channelId}
          />
        );
      default:
        return unreachable(state);
    }
  }
}

function defundRequestedAndDefundChosen(processId, channelId) {
  return multipleWalletActions({
    actions: [actions.defundChosen({ processId }), defundRequested({ channelId })],
  });
}

const mapDispatchToProps = {
  approve: actions.concludeApproved,
  defund: defundRequestedAndDefundChosen,
  acknowledge: actions.acknowledged,
  keepOpen: actions.keepOpenChosen,
};

export const Concluding = connect(
  () => ({}),
  mapDispatchToProps,
)(ConcludingContainer);
