import React, {useState} from 'react';
import {RouteComponentProps, useLocation} from 'react-router-dom';
import {askForFunds} from '../../clients/embedded-wallet-client';
import {download} from '../../clients/web3torrent-client';
import {FormButton} from '../../components/form';
import {TorrentInfo} from '../../components/torrent-info/TorrentInfo';
import {Status} from '../../types';
import {parseMagnetURL} from '../../utils/magnet';
import torrentStatusChecker from '../../utils/torrent-status-checker';
import {useInterval} from '../../utils/useInterval';
import './Download.scss';

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
        <>
          <FormButton
            name="download"
            onClick={async () => {
              await askForFunds();
              setTorrent({...torrent, ...(await download(torrent.magnetURI))});
            }}
          >
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
