import React from 'react';
import {Torrent} from '../../types';
import {FormButton} from '../form';
import {ProgressBar} from './progress-bar/ProgressBar';
import './TorrentInfo.scss';

export type TorrentInfoProps = {torrent: Torrent};

const TorrentInfo: React.FC<TorrentInfoProps> = ({torrent}: TorrentInfoProps) => {
  return (
    <>
      <section className={`torrentInfo ${torrent.magnetURI ? ' with-link' : ''}`}>
        <span className="fileName">{torrent.name}</span>
        <span className="fileSize">{torrent.length}Mb</span>
        {torrent.status ? <span className="fileStatus">{torrent.status}</span> : false}
        <span className="fileCost">Est. cost ${torrent.cost}</span>
        {torrent.magnetURI ? (
          <a href={torrent.magnetURI} className="fileLink">
            Share Link
          </a>
        ) : (
          false
        )}
      </section>
      {!torrent.downloaded ? (
        false
      ) : (
        <section className="downloadingInfo">
          <ProgressBar
            downloaded={torrent.downloaded || 0}
            size={torrent.length || 0}
            status={torrent.downloaded !== torrent.length ? 'Downloading' : 'Completed'}
          />
          <p>
            ETA 1m30s. 500Kbits/s down, 500Kbits/s up <br />
            Connected to <strong>10</strong> peers.
          </p>
          {torrent.downloaded !== torrent.length ? (
            false
          ) : (
            <FormButton name="save-download" onClick={() => null}>
              Save Download
            </FormButton>
          )}
        </section>
      )}
      {!torrent.uploaded ? (
        false
      ) : (
        <section className="uploadingInfo">
          <p>
            Total Recieved: <strong>$1.34</strong>
            <br />
            <strong>{torrent.numPeers}</strong> Peers connected
          </p>
        </section>
      )}
    </>
  );
};

export {TorrentInfo};
