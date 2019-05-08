import React, { Fragment } from 'react';

export default class WaitForOpponentConclude extends React.PureComponent {
  render() {
    return (
      <Fragment>
        <h1>Waiting for opponent...</h1>

        <p>They will agree to conclude the channel.</p>
      </Fragment>
    );
  }
}
