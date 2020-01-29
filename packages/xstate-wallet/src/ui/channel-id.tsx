import React from 'react';
import './wallet.scss';
import {Blockie, Tooltip, Avatar} from 'rimble-ui';

interface Props {
  channelId?: string;
}

export const ChannelId = (props: Props) => {
  if (props.channelId) {
    return (
      <Tooltip message={props.channelId}>
        <Avatar src="" ml="auto" mr="auto">
          <Blockie
            opts={{
              seed: props.channelId,
              color: '#2728e2',
              bgcolor: '#46A5D0',
              size: 15,
              scale: 3,
              spotcolor: '#000'
            }}
          />
        </Avatar>
      </Tooltip>
    );
  } else return <div></div>;
};
