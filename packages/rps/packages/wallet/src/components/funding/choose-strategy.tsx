import React from 'react';
import ApproveX from '../approve-x';
import { Strategy } from '../../redux/protocols/funding';

interface Props {
  strategyChosen: (strategy: Strategy) => void;
  cancelled: () => void;
}

export default class ChooseStrategy extends React.PureComponent<Props> {
  render() {
    const { strategyChosen, cancelled } = this.props;
    return (
      <ApproveX
        title="Funding channel"
        description="Do you want to fund this state channel with a re-usable ledger channel?"
        yesMessage="Fund Channel"
        noMessage="Cancel"
        approvalAction={() => strategyChosen(Strategy.IndirectFunding)}
        rejectionAction={cancelled}
      >
        <React.Fragment>This site wants you to fund a new state channel.</React.Fragment>
      </ApproveX>
    );
  }
}
