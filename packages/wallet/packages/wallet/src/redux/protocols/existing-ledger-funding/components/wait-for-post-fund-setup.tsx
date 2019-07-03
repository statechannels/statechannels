import React, { Fragment } from 'react';

interface Props {
  channelId: string;
}

export default class WaitForPostFundSetup extends React.PureComponent<Props> {
  render() {
    return (
      <Fragment>
        <h1>Waiting...</h1>
        For your opponent to send a PostFundSetup for channel
        <div className="channel-address">{this.props.channelId}</div>
      </Fragment>
    );
  }
}
