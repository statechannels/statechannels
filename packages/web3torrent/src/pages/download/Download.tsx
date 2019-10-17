import React, {useState} from 'react';
import {RouteComponentProps, useLocation} from 'react-router-dom';
import {download} from '../../clients/web3torrent-client';
import {FormButton} from '../../components/form';
import {TorrentInfo} from '../../components/torrent-info/TorrentInfo';
import {Status, Torrent} from '../../types';
import {parseMagnetURL} from '../../utils/magnet';
import torrentStatusChecker from '../../utils/torrent-status-checker';
import {useInterval} from '../../utils/useInterval';
import './Download.scss';

const askForFunds = async (torrent: Torrent, setTorrent) => {
  window.EmbeddedWallet.enable();
  window.EmbeddedWallet.request({
    jsonrpc: '2.0',
    method: 'chan_allocate',
    id: 123,
    params: ['foo', 'bar', 3, false]
  }).then(async result => {
    console.log('result', result);
    setTorrent({...torrent, ...(await download(torrent.magnetURI))});
  });
};

const DownloadStarter: React.FC<{torrent: Torrent; setTorrent: React.Dispatch<Torrent>}> = ({
  torrent,
  setTorrent
}) => {
  return (
    <>
      <FormButton name="download" onClick={() => askForFunds(torrent, setTorrent)}>
        Start Download
      </FormButton>
      <div className="subtitle">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua.
        </p>
      </div>
    </>
  );
};

const Download: React.FC<RouteComponentProps> = () => {
  const [torrent, setTorrent] = useState(parseMagnetURL(useLocation().hash));

  useInterval(
    () => setTorrent(torrentStatusChecker(torrent, torrent.infoHash)),
    torrent.status !== Status.Idle && !torrent.done && !torrent.destroyed ? 1000 : undefined
  );

  return (
    <section className="section fill download">
      <TorrentInfo torrent={torrent} />
      {torrent.status === Status.Idle ? (
        <DownloadStarter torrent={torrent} setTorrent={setTorrent} />
      ) : (
        false
      )}
    </section>
  );
};

export default Download;
