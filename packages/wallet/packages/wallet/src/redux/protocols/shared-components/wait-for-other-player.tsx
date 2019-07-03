import React from 'react';

interface Props {
  actionDescriptor: string;
  channelId?: string;
}

export default class WaitForOtherPlayer extends React.PureComponent<Props> {
  render() {
    const { actionDescriptor, channelId } = this.props;
    return (
      <div>
        <h2>Waiting for the other player</h2>
        <div>
          We're waiting on the other player to complete their {actionDescriptor} for channel
          <div className="channel-address">{channelId || 'unknown'}</div>
          Hang tight and we'll let you know when they're done!
        </div>
      </div>
    );
  }
}
