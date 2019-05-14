import React, { Fragment } from 'react';

interface Props {
  ledgerId: string;
}

export default class WaitForLedgerUpdate extends React.PureComponent<Props> {
  render() {
    return (
      <Fragment>
        <h1>Waiting for your opponent to respond!</h1>
        <p>...with an update to ledger channel ${this.props.ledgerId}</p>
      </Fragment>
    );
  }
}
