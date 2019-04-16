import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { TransactionSubmissionState } from './states';
import { unreachable } from '../../../utils/reducer-utils';
import * as states from './states';

interface Props {
  state: TransactionSubmissionState;
}

class TransactionSubmissionContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case states.WAIT_FOR_SEND:
      case states.WAIT_FOR_SUBMISSION:
      case states.WAIT_FOR_CONFIRMATION:
      case states.APPROVE_RETRY:
      case states.FAILURE:
      case states.SUCCESS:
        return <div>Hello</div>;
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {};

export const TransactionSubmission = connect(
  () => ({}),
  mapDispatchToProps,
)(TransactionSubmissionContainer);
