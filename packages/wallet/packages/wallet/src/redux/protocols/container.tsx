import { PureComponent } from 'react';
import { ProtocolState } from '.';
import * as fundingStates from './funding/states';
import * as concludingStates from './concluding/state';
import React from 'react';
import { Funding } from './funding/container';
import { Concluding } from './concluding/container';
import { connect } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

interface Props {
  protocolState: ProtocolState;
}

class ProtocolContainer extends PureComponent<Props> {
  render() {
    // TODO: A switch/unreachable would be better here
    // if we can figure out a way to do it.
    // Maybe every state has a protocol type on it?
    const { protocolState } = this.props;
    if (fundingStates.isFundingState(protocolState) && !fundingStates.isTerminal(protocolState)) {
      return <Funding state={protocolState} />;
    } else if (concludingStates.isConcludingState(protocolState)) {
      return <Concluding state={protocolState} />;
    } else {
      return (
        <div>
          <FontAwesomeIcon icon={faSpinner} pulse={true} size="lg" />
        </div>
      );
    }
  }
}
export const Protocol = connect(() => ({}))(ProtocolContainer);
