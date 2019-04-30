import { PureComponent } from 'react';
import { ProtocolState } from '.';
import * as fundingStates from './funding/states';
import React from 'react';
import { Funding } from './funding/container';
import { connect } from 'react-redux';

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
    } else {
      return <div>TODO</div>;
    }
  }
}
export const Protocol = connect(() => ({}))(ProtocolContainer);
