import React, { Fragment } from 'react';
import { Button } from 'reactstrap';

interface Props {
  approve: () => void;
  deny: () => void;
}

export default class ApproveChallenge extends React.PureComponent<Props> {
  render() {
    const { approve, deny } = this.props;
    return (
      <Fragment>
        <h1>Approve Challenge</h1>

        <p>Do you want to launch a challenge on the blockchain?</p>

        <p>
          Launching a challenge will take time and cost a small amount but will allow you to reclaim
          your funds if there's no response from your opponent.
        </p>

        <Button onClick={deny}>Cancel</Button>
        <Button onClick={approve}>Launch challenge!</Button>
      </Fragment>
    );
  }
}
