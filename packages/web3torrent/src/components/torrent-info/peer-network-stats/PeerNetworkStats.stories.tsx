import {withActions} from '@storybook/addon-actions';
import {withKnobs} from '@storybook/addon-knobs';
import {storiesOf} from '@storybook/react';
import React from 'react';
import '../../../App.scss';
import {TorrentUI} from '../../../types';
import {PeerNetworkStats} from './PeerNetworkStats';
import './PeerNetworkStats.scss';
import {createMockTorrentPeers} from '../../../utils/test-utils';

const b = '0xBaaed72f864dD1ead0006e7Fb4A85D4bBf25e10F';
const d = '0xf864dD1ead0006e7Fb4A85D4bBf25e10Fc0Bed72';

const c1 = '0x4A85D4bBf25e10Fc0Bed72Fb4A85D4bBf25e10Fc0Bed72f864dD1ead0006e7Fb';
const c2 = '0xe10Fc0Bed72f864dD1ead0006e7Fb4A85D4bBf25e10Fc0Bed72Fb4A85D4bBf25';

storiesOf('Web3Torrent', module)
  .addDecorator(withActions('click'))
  .addDecorator(withKnobs())
  .add('PeerNetworkStats', () => (
    <PeerNetworkStats
      torrent={
        ({
          numPeers: 2,
          _peers: createMockTorrentPeers(),
          wires: [
            {
              paidStreamingExtension: {
                peerAccount: d,
                pseChannelId: c1
              },
              uploaded: 666
            },
            {
              paidStreamingExtension: {
                peerAccount: b,
                pseChannelId: c2
              },
              uploaded: 333
            }
          ]
        } as unknown) as TorrentUI
      }
    ></PeerNetworkStats>
  ));
