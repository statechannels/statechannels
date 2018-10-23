import React from 'react';
import Button from 'reactstrap/lib/Button';

interface Props {
    withdraw:()=>void;
}

export default class GameOverPage extends React.PureComponent<Props> {
  render() {
    const { withdraw } = this.props;

    return (
      <div className="container centered-container">
        <div className="w-100 text-center mb-5">
          <h1 className="mb-5">Game over</h1>
          <Button onClick={withdraw}>Withdraw</Button>
        </div>
      </div>
    );
  }
}
