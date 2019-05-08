import React, { Fragment } from 'react';
import { Button } from 'reactstrap';

interface Props {
  approve: () => void;
}

export default class ApproveConcluding extends React.PureComponent<Props> {
  render() {
    const { approve } = this.props;
    return (
      <Fragment>
        <h1>Approve concluding this channel</h1>

        <p>Do you want to conclude this channel?</p>

        <p>Your opponent instigated this process</p>

        <Button onClick={approve}>Conclude</Button>
      </Fragment>
    );
  }
}
