import React, { Fragment } from 'react';
import { Button } from 'reactstrap';

interface Props {
  approve: () => void;
}

export default class ApproveDefunding extends React.PureComponent<Props> {
  render() {
    const { approve } = this.props;
    return (
      <Fragment>
        <h1>Channel concluded</h1>

        <p>Do you want to defund this channel?</p>
        <Button onClick={approve}>Defund</Button>
      </Fragment>
    );
  }
}
