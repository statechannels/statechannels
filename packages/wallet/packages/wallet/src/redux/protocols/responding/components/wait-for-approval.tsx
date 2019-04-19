import React, { Fragment } from 'react';
import Button from 'reactstrap/lib/Button';

interface Props {
  approve: () => void;
  deny: () => void;
}
export default class WaitForApproval extends React.PureComponent<Props> {
  render() {
    const { approve, deny } = this.props;
    return (
      <Fragment>
        <h1>Challenge Detected</h1>
        <div>
          <p>You have been challenged! </p>
          <p>Would you like to respond?</p>
          <Button onClick={approve}>Approve</Button>
          <Button onClick={deny}>Deny</Button>
        </div>
      </Fragment>
    );
  }
}
