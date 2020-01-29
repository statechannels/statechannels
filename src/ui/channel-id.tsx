import React from 'react';
import './wallet.scss';
import {Blockie, Tooltip} from 'rimble-ui';

interface Props {
  channelId?: string;
}

export const ChannelId = (props: Props) => {
  if (props.channelId) {
    return (
      <Tooltip message={props.channelId}>
        <div>
          <Blockie // TODO extend this class to make a visual rep of a channelId (which is longer than an ethereum address anyway)
            opts={{
              seed: props.channelId,
              color: '#dfe',
              bgcolor: '#a71',
              size: 15,
              scale: 3,
              spotcolor: '#000'
            }}
          />
          <br></br>
          <span className="channel-id">{props.channelId.slice(0, 6) + '...'}</span>
        </div>
      </Tooltip>
    );
  } else return <div></div>;
};
