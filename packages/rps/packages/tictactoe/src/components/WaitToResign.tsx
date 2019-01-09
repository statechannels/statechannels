import React from 'react';

export default class WaitToResign extends React.PureComponent<{}> {
  render() {
    return (
      <div className="container centered-container">
        <div className="w-100 text-center mb-5">
          <h1 className="mb-5">
            Waiting for opponent's response
          </h1>
          <p className="lead">We can only conclude the game after the opponent responds. </p>
        </div>
      </div>
    );
  }
}