import {ChannelClient} from '@statechannels/channel-client';
import React, {useEffect, useState} from 'react';
import {RouteComponentProps, useLocation} from 'react-router-dom';

import {download, getTorrentPeers} from '../../clients/web3torrent-client';
import {FormButton} from '../../components/form';
import {TorrentInfo} from '../../components/torrent-info/TorrentInfo';
import {TorrentPeers} from '../../library/types';
import {Status, Torrent} from '../../types';
import {parseMagnetURL} from '../../utils/magnet';
import torrentStatusChecker from '../../utils/torrent-status-checker';
import {useInterval} from '../../utils/useInterval';
import './File.scss';
import {Web3TorrentChannelClient} from '../../clients/web3t-channel-client';

import {ChannelList} from '../../components/channel-list/ChannelList';
import {mockChannels, mockCurrentUser} from '../../constants';

const getTorrentAndPeersData: (
  setTorrent: React.Dispatch<React.SetStateAction<Torrent>>,
  setPeers: React.Dispatch<React.SetStateAction<TorrentPeers>>
) => (torrent: Torrent) => void = (setTorrent, setPeers) => torrent => {
  const liveTorrent = torrentStatusChecker(torrent, torrent.infoHash);
  const livePeers = getTorrentPeers(torrent.infoHash);
  setTorrent(liveTorrent);
  setPeers(livePeers);
};

interface Props {
  currentNetwork: number;
  requiredNetwork: number;
}

const File: React.FC<RouteComponentProps & Props> = props => {
  const [torrent, setTorrent] = useState(parseMagnetURL(useLocation().hash));
  const [peers, setPeers] = useState({});
  const [loading, setLoading] = useState(false);
  const [buttonLabel, setButtonLabel] = useState('Start Download');
  const [errorLabel, setErrorLabel] = useState('');
  const getLiveData = getTorrentAndPeersData(setTorrent, setPeers);

  // TODO move this to a more abvious place (we may need it in other components)
  const channelClient = new Web3TorrentChannelClient(new ChannelClient(window.channelProvider));

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
            disabled={props.currentNetwork !== props.requiredNetwork}
            onClick={async () => {
              setLoading(true);
              setErrorLabel('');
              setButtonLabel('Preparing Download...');
              try {
                // TODO: Put real values here
                await channelClient.approveBudgetAndFund('', '', '', '', '');
                setTorrent({...torrent, ...(await download(torrent.magnetURI))});
              } catch (error) {
                setErrorLabel(
                  // FIXME: 'put human readable error here'
                  error.toString()
                  // getUserFriendlyError(error.code)
                );
              }
              setLoading(false);
              setButtonLabel('Start Download');
            }}
          >
            {buttonLabel}
          </FormButton>
          {errorLabel && <p className="error">{errorLabel}</p>}
          <div className="subtitle">
            <p>
              <strong>How do I pay for the download?</strong>
              <br />
              When you click "Start Download", you'll be asked to allocate an amount of ETH so
              Web3Torrent can collect payments on your behalf and transfer those funds to the
              seeder. Unlike other systems, the payment is not upfront; instead, you pay as you
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
              , a technique that reduces fees for blockchain users, allowing them to transact with
              each other on faster-than-on-chain operating times. This technology enables a private,
              efficient and secure environment for transactions.
            </p>
          </div>
        </>
      ) : (
        false
      )}
      <ChannelList channels={mockChannels} currentUser={mockCurrentUser} />
    </section>
  );
};

export default File;
