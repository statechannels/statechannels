import React from 'react';
import {storiesOf} from '@storybook/react';

import {ChannelId} from '../channel-id';

const testContext = {
  channelId: '0x697ecf681033a2514ed19c90299a67ae8677f3c78b5877fe4550c4f0960e87b7'
};

storiesOf('ChannelId', module).add('empty', () => <ChannelId channelId={undefined} />);
storiesOf('ChannelId', module).add('not empty', () => (
  <ChannelId channelId={testContext.channelId} />
));
