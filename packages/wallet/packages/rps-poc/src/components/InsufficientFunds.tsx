import React from 'react';

export default class InsufficientFunds extends React.PureComponent<{}> {
  render() {
    return (
      <div className="container centered-container">
        <div className="w-100 text-center mb-5">
          <h1 className="mb-5">
            Game concluding:
          </h1>
          {/* TODO: Display which player ran out of funds. */}
          <p className="lead">You or your opponent has run out of funds.</p>
        </div>
      </div>
    );
  }
}