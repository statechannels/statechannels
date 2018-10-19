import React from 'react';
import Button from 'reactstrap/lib/Button';

interface Props {
  message: string;
  createBlockchainChallenge:()=>void;
}

export default class WaitingStep extends React.PureComponent<Props> {
  render() {
    const { message, createBlockchainChallenge } = this.props;

    return (
      <div className="container centered-container">
        <div className="w-100 text-center mb-5">
          <h1 className="mb-5">Waiting ...</h1>
          <p className="lead">{message}</p>
          <Button onClick={createBlockchainChallenge}>Challenge</Button>
        </div>
      </div>
    );
  }
}
