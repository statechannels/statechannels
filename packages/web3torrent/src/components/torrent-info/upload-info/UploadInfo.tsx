import prettier from 'prettier-bytes';
import React from 'react';
import {Torrent} from '../../../types';
import './UploadInfo.scss';
import {ChannelState} from '../../../clients/payment-channel-client';
import {utils} from 'ethers';

const bigNumberify = utils.bigNumberify;

export type UploadInfoProps = {
  torrent: Torrent;
  channelCache: Record<string, ChannelState>;
  mySigningAddress: string;
};

const UploadInfo: React.FC<UploadInfoProps> = ({
  torrent,
  channelCache = {},
  mySigningAddress
}: UploadInfoProps) => {
  const mySeedingChannelIds: string[] = Object.keys(channelCache).filter(
    key => channelCache[key].beneficiary === mySigningAddress
  );
  const totalReceived = mySeedingChannelIds
    .map(id => channelCache[id].beneficiaryBalance)
    .reduce((a, b) => bigNumberify(a).add(bigNumberify(b)), bigNumberify(0))
    .toNumber();
  return (
    <>
      <section className="uploadingInfo">
        <p>
          Total Received: <strong>{totalReceived}</strong> wei
          <br />
          <strong data-test-selector="numPeers">{torrent.numPeers}</strong> Peers connected
        </p>
      </section>
      <section className="wires-list">
        <table className="wires-list-table">
          <tbody>
            {Object.values(torrent.wires).map(wire => {
              const leecher = wire.paidStreamingExtension.peerAccount;
              const channelId = wire.paidStreamingExtension.pseChannelId;
              return (
                mySeedingChannelIds.includes(channelId) && (
                  <tr className="leecherInfo" key={leecher}>
                    <td>
                      <button>Close</button>
                    </td>
                    <td className="channel-id">{channelId}</td>
                    <td className="leecher-id">{leecher}</td>
                    <td className="leecher-downloaded">{prettier(wire.uploaded)}&nbsp;up</td>
                    <td className="leecher-paid">
                      {Number(channelCache[channelId].beneficiaryBalance)} wei
                    </td>
                  </tr>
                )
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
};

export {UploadInfo};
