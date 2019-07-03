import React, { Fragment } from 'react';

interface Props {
  channelId: string;
}

export default class WaitForLedgerUpdate extends React.PureComponent<Props> {
  render() {
    return (
      <Fragment>
        <h1>Preparing for top-up...</h1>
        Waiting for your opponent to confirm updates to ledger channel:
        <div className="channel-address">{this.props.channelId}</div>
      </Fragment>
    );
  }
}
