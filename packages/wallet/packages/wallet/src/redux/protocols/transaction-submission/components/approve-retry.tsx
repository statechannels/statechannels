import React, { Fragment } from 'react';
import { Button } from 'reactstrap';

interface Props {
  name: string;
  approve: () => void;
  deny: () => void;
}

export default class ApproveRetry extends React.PureComponent<Props> {
  render() {
    const { name, approve, deny } = this.props;
    return (
      <Fragment>
        <h1>Transaction Failed</h1>
        <p>The {name} transaction was not submitted to the network. Hit retry to try again.</p>

        <Button onClick={deny}>Cancel</Button>
        <Button onClick={approve}>Retry</Button>
      </Fragment>
    );
  }
}
