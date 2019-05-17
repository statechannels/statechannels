import React, { Fragment } from 'react';
import Button from 'reactstrap/lib/Button';

interface Props {
  approve: () => void;
}
export default class WaitForApproval extends React.PureComponent<Props> {
  render() {
    const { approve } = this.props;
    return (
      <Fragment>
        <h1>Challenge Detected</h1>
        <div>
          <p>You have been challenged! </p>
          <p>Would you like to respond?</p>
          <Button onClick={approve}>Respond</Button>
        </div>
      </Fragment>
    );
  }
}
