import React, {useState} from 'react';
import {RouteComponentProps} from 'react-router-dom';
import {FormButton} from '../../components/form';
import {TorrentInfo} from '../../components/torrent-info/TorrentInfo';
import {Torrent} from '../../types';
import './Download.scss';
import {download} from '../../clients/web3torrent-client';

// const mockDownload = (torrent: Torrent, setTorrent) => {
//   window.EmbeddedWallet.enable();
//   window.EmbeddedWallet.request({
//     jsonrpc: '2.0',
//     method: 'chan_allocate',
//     id: 123,
//     params: ['foo', 'bar', 3, false]
//   }).then(result => {
//     console.log('Callback has data!', result);
//     for (let i = 0; i * 20 <= torrent.length + 19; i++) {
//       setTimeout(() => {
//         setTorrent({...torrent, downloaded: i * 20 > torrent.length ? torrent.length : i * 20});
//       }, i * 800);
//     }
//   });
// };
const downloadFile = async (torrent: Torrent, setTorrent) => {
  const createdTorrent = await download(torrent.magnetURI);
  console.log('Torrent', createdTorrent);
  console.log('torrent in mem', {...torrent, createdTorrent});
  // for (let i = 0; i * 20 <= torrent.length + 19; i++) {
  //   setTimeout(() => {
  setTorrent({...torrent, ...createdTorrent});
  //   }, i * 800);
  // }
};

const Download: React.FC<RouteComponentProps> = () => {
  const [torrent, setTorrent] = useState({
    magnetURI: 'https://webtorrent.io/torrents/sintel.torrent',
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
          <FormButton name="download" onClick={() => downloadFile(torrent, setTorrent)}>
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
