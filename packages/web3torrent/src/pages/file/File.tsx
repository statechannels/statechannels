import React, {useEffect, useState, useContext} from 'react';
import {RouteComponentProps, useLocation} from 'react-router-dom';

import {download, getTorrentPeers, Web3TorrentContext} from '../../clients/web3torrent-client';
import {FormButton} from '../../components/form';
import {TorrentInfo} from '../../components/torrent-info/TorrentInfo';
import {SiteBudgetTable} from '../../components/site-budget-table/SiteBudgetTable';
import {TorrentPeers} from '../../library/types';
import {Status, Torrent} from '../../types';
import {parseMagnetURL} from '../../utils/magnet';
import torrentStatusChecker from '../../utils/torrent-status-checker';
import {useInterval} from '../../utils/useInterval';
import './File.scss';
import WebTorrentPaidStreamingClient from '../../library/web3torrent-lib';
import _ from 'lodash';

const getTorrentAndPeersData: (
  web3torrent: WebTorrentPaidStreamingClient,
  setTorrent: React.Dispatch<React.SetStateAction<Torrent>>,
  setPeers: React.Dispatch<React.SetStateAction<TorrentPeers>>
) => (torrent: Torrent) => void = (web3torrent, setTorrent, setPeers) => torrent => {
  const liveTorrent = torrentStatusChecker(web3torrent)(torrent, torrent.infoHash);
  const livePeers = getTorrentPeers(torrent.infoHash);
  setTorrent(liveTorrent);
  setPeers(livePeers);
};

interface Props {
  ready: boolean;
}

const File: React.FC<RouteComponentProps & Props> = props => {
  const web3Torrent = useContext(Web3TorrentContext);
  const [torrent, setTorrent] = useState(parseMagnetURL(useLocation().hash));
  const [, setPeers] = useState({});
  const [loading, setLoading] = useState(false);
  const [buttonLabel, setButtonLabel] = useState('Start Download');
  const [errorLabel, setErrorLabel] = useState('');

  const getLiveData = getTorrentAndPeersData(web3Torrent, setTorrent, setPeers);

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
      <div className="jumbotron-upload">
        <h1>{torrent.originalSeed ? 'Upload a File' : 'Download a File'}</h1>
      </div>
      <Web3TorrentContext.Consumer>
        {web3Torrent => {
          const {
            channelCache,
            budgetCache,
            mySigningAddress: me
          } = web3Torrent.paymentChannelClient;
          // Only show budget when any channel exists.
          const showBudget = !_.isEmpty(budgetCache) && Object.keys(channelCache).length > 0;
          return (
            <>
              <TorrentInfo torrent={torrent} channelCache={channelCache} mySigningAddress={me} />
              <br />
              {showBudget ? (
                <SiteBudgetTable
                  budgetCache={budgetCache}
                  channelCache={channelCache}
                  mySigningAddress={me}
                />
              ) : (
                false
              )}
            </>
          );
        }}
      </Web3TorrentContext.Consumer>
      {torrent.status === Status.Idle ? (
        <>
          <FormButton
            name="download"
            spinner={loading}
            disabled={!props.ready || buttonLabel === 'Preparing Download...'}
            onClick={async () => {
              setLoading(true);
              setErrorLabel('');
              setButtonLabel('Preparing Download...');
              try {
                // TODO: Put real values here
                // await web3torrent.paymentChannelClient.approveBudgetAndFund('', '', '', '', '');
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
              Web3Torrent can collect payments on your behalf and transfer those funds to peers who
              have pieces of the file . Unlike other systems, the payment is not upfront; instead,
              you pay as you download.
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
    </section>
  );
};

export default File;
