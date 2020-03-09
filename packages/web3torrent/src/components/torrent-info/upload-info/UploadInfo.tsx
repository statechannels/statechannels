import prettier from 'prettier-bytes';
import React from 'react';
import {TorrentPeers} from '../../../library/types';
import {Torrent} from '../../../types';
import './UploadInfo.scss';
import {calculateWei} from '../../../utils/calculateWei';

export type UploadInfoProps = {torrent: Torrent; peers?: TorrentPeers};

const UploadInfo: React.FC<UploadInfoProps> = ({torrent, peers = {}}) => {
  return (
    <>
      <section className="uploadingInfo">
        <p>
          Total Received: <strong>{calculateWei(torrent.uploaded)}</strong>
          <br />
          <strong data-test-selector="numPeers">{torrent.numPeers}</strong> Peers connected
        </p>
      </section>
      <section className="leechersInfo">
        {Object.values(peers).map(leecher => (
          <div className="leecherInfo" key={leecher.id}>
            <span className="leecher-id">#{leecher.id.slice(0, 18)}...</span>
            <span className="leecher-downloaded">
              {leecher.wire && prettier(leecher.wire.uploaded)}
            </span>
            <span className="leecher-paid">
              ${leecher.wire && calculateWei(leecher.wire.uploaded)}
            </span>
          </div>
        ))}
      </section>
    </>
  );
};

export {UploadInfo};
