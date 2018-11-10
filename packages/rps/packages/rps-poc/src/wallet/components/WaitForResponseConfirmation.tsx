import React from 'react';

export default class WaitForResponseConfirmation extends React.PureComponent<{}> {
  render() {
    return (
      <div>
        <h1>Waiting for Challenge Conclusion</h1>
        <p>
          Waiting for the challenge response to be recorded.
        </p>
      </div>
    );
  }
}
