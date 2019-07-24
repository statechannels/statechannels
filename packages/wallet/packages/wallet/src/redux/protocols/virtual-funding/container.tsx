import * as states from './states';
import { PureComponent } from 'react';
import React from 'react';

import { connect } from 'react-redux';
import { IndirectFunding } from '../indirect-funding/container';
import { ConsensusUpdate } from '../consensus-update/container';
import { AdvanceChannel } from '../advance-channel/container';
import { unreachable } from '../../../utils/reducer-utils';

interface Props {
  state: states.NonTerminalVirtualFundingState;
}

class VirtualFundingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case 'VirtualFunding.WaitForGuarantorFunding':
        return <IndirectFunding state={state.indirectGuarantorFunding} />;
      case 'VirtualFunding.WaitForApplicationFunding':
        return <ConsensusUpdate state={state.indirectApplicationFunding} />;
      case 'VirtualFunding.WaitForGuarantorChannel':
        return <AdvanceChannel state={state.guarantorChannel} />;
      case 'VirtualFunding.WaitForJointChannel':
        return <AdvanceChannel state={state.jointChannel} />;
      default:
        return unreachable(state);
    }
  }
}

export const VirtualFunding = connect(() => ({}))(VirtualFundingContainer);
