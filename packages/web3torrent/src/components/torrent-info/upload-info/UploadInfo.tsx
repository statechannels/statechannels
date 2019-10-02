import React from 'react';

import {PeerByTorrent} from '../../../library/types';
import {Torrent} from '../../../types';
import './UploadInfo.scss';

export type UploadInfoProps = {torrent: Torrent};

const mockedLeechers: Array<Partial<PeerByTorrent> & {downloaded: number; paid: number}> = [
  {id: '12312312', allowed: true, downloaded: 11, paid: 0.09},
  {id: '45674131', allowed: true, downloaded: 58, paid: 0.25},
  {id: '56843137', allowed: true, downloaded: 120, paid: 0.5},
  {id: '31897432', allowed: true, downloaded: 120, paid: 0.5}
];

const UploadInfo: React.FC<UploadInfoProps> = ({torrent}: UploadInfoProps) => {
  return (
    <>
      <section className="uploadingInfo">
        <p>
          Total Received: <strong>$1.34</strong>
          <br />
          <strong>{torrent.numPeers}</strong> Peers connected
        </p>
      </section>
      <section className="leechersInfo">
        {mockedLeechers.length
          ? mockedLeechers.map(leecher => (
              <div className="leecherInfo" key={leecher.id}>
                <span className="leecher-id">#{leecher.id}</span>
                <span className="leecher-downloaded">{leecher.downloaded}Mb</span>
                <span className="leecher-paid">${leecher.paid.toFixed(2)}</span>
              </div>
            ))
          : false}
      </section>
    </>
  );
};

export {UploadInfo};
