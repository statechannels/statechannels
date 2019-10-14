import React, {useState} from 'react';
import {RouteComponentProps, useLocation} from 'react-router-dom';
import {download, getLiveTorrentData, parseMagnetURL} from '../../clients/web3torrent-client';
import {FormButton} from '../../components/form';
import {TorrentInfo} from '../../components/torrent-info/TorrentInfo';
import {Status, Torrent} from '../../types';
import {useInterval} from '../../utils/useInterval';
import './Download.scss';

const DownloadStarter: React.FC<{torrent: Torrent; setTorrent: React.Dispatch<Torrent>}> = ({
  torrent,
  setTorrent
}) => {
  return (
    <>
      <FormButton
        name="download"
        onClick={async () => setTorrent({...torrent, ...(await download(torrent.magnetURI))})}
      >
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
  const [torrent, setTorrent] = useState(parseMagnetURL(decodeURIComponent(useLocation().hash)));

  useInterval(
    () => setTorrent(getLiveTorrentData(torrent, torrent.infoHash)),
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
