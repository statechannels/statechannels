import React, { Fragment } from 'react';

interface Props {
  ledgerId: string;
  channelId: string;
}

export default class WaitForLedgerUpdate extends React.PureComponent<Props> {
  render() {
    return (
      <Fragment>
        <h1>Waiting...</h1>
        For your opponent to confirm indirect funding for channel:
        <div className="channel-address">{this.props.channelId}</div> via ledger channel:
        <div className="channel-address">{this.props.ledgerId}</div>
      </Fragment>
    );
  }
}
