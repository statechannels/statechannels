import React, { Fragment } from 'react';

export default class WaitForOpponentDecision extends React.PureComponent {
  render() {
    return (
      <Fragment>
        <h1>Waiting...</h1>

        <p>For your opponent to decide whether to de-fund or keep the channel open.</p>
      </Fragment>
    );
  }
}
