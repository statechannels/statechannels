import React, {useEffect, useState} from 'react';
import {RouteComponentProps, useLocation} from 'react-router-dom';
import {askForFunds} from '../../clients/embedded-wallet-client';
import {download, getTorrentPeers} from '../../clients/web3torrent-client';
import {FormButton} from '../../components/form';
import {TorrentInfo} from '../../components/torrent-info/TorrentInfo';
import {TorrentPeers} from '../../library/types';
import {Status, Torrent} from '../../types';
import {parseMagnetURL} from '../../utils/magnet';
import torrentStatusChecker from '../../utils/torrent-status-checker';
import {useInterval} from '../../utils/useInterval';
import './File.scss';

const getTorrentAndPeersData: (
  setTorrent: React.Dispatch<React.SetStateAction<Torrent>>,
  setPeers: React.Dispatch<React.SetStateAction<TorrentPeers>>
) => (torrent: Torrent) => void = (setTorrent, setPeers) => torrent => {
  const liveTorrent = torrentStatusChecker(torrent, torrent.infoHash);
  const livePeers = getTorrentPeers(torrent.infoHash);
  setTorrent(liveTorrent);
  setPeers(livePeers);
};

const File: React.FC<RouteComponentProps> = () => {
  const [torrent, setTorrent] = useState(parseMagnetURL(useLocation().hash));
  const [peers, setPeers] = useState({});
  const [loading, setLoading] = useState(false);
  const [buttonLabel, setButtonLabel] = useState('Start Download');
  const getLiveData = getTorrentAndPeersData(setTorrent, setPeers);

  useEffect(() => {
    if (torrent.infoHash) {
      getLiveData(torrent);
    }
    // eslint-disable-next-line
  }, []);

  useInterval(
    () => getLiveData(torrent),
    (torrent.status !== Status.Idle || !!torrent.originalSeed) && 1000
  );

  return (
    <section className="section fill download">
      <TorrentInfo torrent={torrent} peers={peers} />
      {torrent.status === Status.Idle ? (
        <>
          <FormButton
            name="download"
            spinner={loading}
            onClick={async () => {
              setLoading(true);
              setButtonLabel('Preparing Download...');
              await askForFunds();
              setTorrent({...torrent, ...(await download(torrent.magnetURI))});
              setLoading(false);
              setButtonLabel('Start Download');
            }}
          >
            {buttonLabel}
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

export default File;
