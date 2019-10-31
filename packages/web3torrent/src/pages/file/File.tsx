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
    (torrent.status !== Status.Idle || !!torrent.createdBy) && 1000
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
              <strong>How do I pay for the download?</strong>
              <br />
              When you click "Start Download", you'll be asked to allocate an amount of ETH so
              Web3Torrent can collect payments on your behalf and transfer those funds to the file
              owner. Unlike other systems, the payment is not upfront; instead, you pay as you
              download.
            </p>
            <p>
              <strong>Is it safe?</strong>
              <br />
              Web3Torrent operates with budgets; therefore, the app will <b>never</b> use any funds
              outside whatever amount you allocate when starting the download. Also, Web3Torrent is
              powered by{' '}
              <a href="http://statechannels.org" target="_blank" rel="noopener noreferrer">
                State Channels
              </a>
              , a technique that reduces fees for blockchain users and allows users to transact
              with each other with instant finality. Through counterfactually instantiated
              contracts, this technology enables a private, efficient and secure environment for
              safe transactions.
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
