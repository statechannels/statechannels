import prettier from 'prettier-bytes';
import React from 'react';
import {TorrentPeers} from '../../../library/types';
import {Torrent} from '../../../types';
import './UploadInfo.scss';

export type UploadInfoProps = {torrent: Torrent; peers?: TorrentPeers};

const UploadInfo: React.FC<UploadInfoProps> = ({torrent, peers}) => {
  const peersArray = Object.values(peers || {});
  return (
    <>
      <section className="uploadingInfo">
        <p>
          Total Received: <strong>$1.34</strong>
          <br />
          <strong data-test-selector="numPeers">{torrent.numPeers}</strong> Peers connected
        </p>
      </section>
      <section className="leechersInfo">
        {peersArray.length
          ? peersArray.map(leecher => (
              <div className="leecherInfo" key={leecher.id}>
                <span className="leecher-id">#{leecher.id}</span>
                <span className="leecher-downloaded">
                  {leecher.wire && prettier(leecher.wire.uploaded)}
                </span>
                <span className="leecher-paid">
                  ${leecher.wire && (leecher.wire.uploaded * 0.000005).toFixed(2)}
                </span>
              </div>
            ))
          : false}
      </section>
    </>
  );
};

export {UploadInfo};
