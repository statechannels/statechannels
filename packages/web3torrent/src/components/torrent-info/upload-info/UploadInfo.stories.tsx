import {withActions} from '@storybook/addon-actions';
import {withKnobs} from '@storybook/addon-knobs';
import {storiesOf} from '@storybook/react';
import React from 'react';
import '../../../App.scss';
import {Torrent} from '../../../types';
import {UploadInfo} from './UploadInfo';
import './UploadInfo.scss';
import {ChannelState} from '../../../clients/payment-channel-client';
import {createMockTorrentPeers} from '../../../utils/test-utils';

const a = '0xFb4A85D4bBf25e10Fc0Bed72f864dD1ead0006e7';
const b = '0xBaaed72f864dD1ead0006e7Fb4A85D4bBf25e10F';
const d = '0xf864dD1ead0006e7Fb4A85D4bBf25e10Fc0Bed72';

const c1 = '0x4A85D4bBf25e10Fc0Bed72Fb4A85D4bBf25e10Fc0Bed72f864dD1ead0006e7Fb';
const c2 = '0xe10Fc0Bed72f864dD1ead0006e7Fb4A85D4bBf25e10Fc0Bed72Fb4A85D4bBf25';

storiesOf('Web3Torrent', module)
  .addDecorator(withActions('click'))
  .addDecorator(withKnobs())
  .add('UploadInfo', () => (
    <UploadInfo
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
        } as unknown) as Torrent
      }
      channelCache={{
        [c1]: {
          channelId: c1,
          beneficiary: a,
          payer: d,
          beneficiaryBalance: '0x13'
        } as ChannelState,
        [c2]: {
          channelId: c2,
          beneficiary: a,
          payer: b,
          beneficiaryBalance: '0x6'
        } as ChannelState
      }}
      mySigningAddress={a}
    ></UploadInfo>
  ));
