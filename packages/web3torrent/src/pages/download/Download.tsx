import React, {useState} from 'react';
import {RouteComponentProps} from 'react-router-dom';
import {FormButton} from '../../components/form';
import {TorrentInfo} from '../../components/torrent-info/TorrentInfo';
import {Torrent} from '../../types';
import './Download.scss';

const mockDownload = (torrent: Torrent, setTorrent) => {
  for (let i = 0; i * 20 <= torrent.length + 19; i++) {
    setTimeout(() => {
      setTorrent({...torrent, downloaded: i * 20 > torrent.length ? torrent.length : i * 20});
    }, i * 800);
  }
};

const Download: React.FC<RouteComponentProps> = () => {
  const [torrent, setTorrent] = useState({
    name: 'Sample_1.dat',
    length: 350,
    numSeeds: 27,
    numPeers: 350,
    cost: 0.5,
    downloaded: 0,
    files: []
  } as Torrent);

  return (
    <section className="section fill download">
      <TorrentInfo torrent={torrent} />
      {!torrent.downloaded ? (
        <>
          <FormButton name="download" onClick={() => mockDownload(torrent, setTorrent)}>
            Start Download
          </FormButton>
          <div className="subtitle">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
        </>
      ) : (
        false
      )}
    </section>
  );
};

export default Download;
