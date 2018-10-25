import React from 'react';

export default class WaitForOpponentToPickMove extends React.PureComponent<{}> {
  render() {
    return (
      <div className="container centered-container">
        <div className="w-100 text-center mb-5">
          <h1 className="mb-5">
            Waiting for your opponent to choose their move 
          </h1>
        </div>
      </div>
    );
  }
}