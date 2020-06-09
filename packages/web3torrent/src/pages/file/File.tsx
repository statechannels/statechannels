import React, {useState, useContext, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {download, Web3TorrentClientContext} from '../../clients/web3torrent-client';
import {FormButton} from '../../components/form';
import {TorrentInfo} from '../../components/torrent-info/TorrentInfo';
import {DomainBudget} from '../../components/domain-budget/DomainBudget';
import {Status, TorrentUI} from '../../types';
import {useQuery} from '../../utils/url';
import {getTorrentUI} from '../../utils/torrent-status-checker';
import './File.scss';
import WebTorrentPaidStreamingClient, {TorrentTestResult} from '../../library/web3torrent-lib';
import _ from 'lodash';
import {Flash} from 'rimble-ui';
import {checkTorrentInTracker} from '../../utils/check-torrent-in-tracker';
import {getUserFriendlyError} from '../../utils/error';
import {useBudget} from '../../hooks/use-budget';
import {track} from '../../analytics';
import {Observable} from 'rxjs';
import {throttleTime} from 'rxjs/operators';
import {logger} from '../../logger';

const log = logger.child({module: 'File'});

async function checkTorrent(infoHash: string) {
  const testResult = await checkTorrentInTracker(infoHash);
  switch (testResult) {
    case TorrentTestResult.NO_CONNECTION:
      return 'Your connection to the tracker may be limited, you might have unexpected functionality';
    case TorrentTestResult.NO_SEEDERS_FOUND:
      return "Seems like the torrent doesn't have any seeders. You can give it a try nonetheless.";
    default:
      return '';
  }
}

function buttonLabel(loading: boolean): string {
  return loading ? 'Preparing Download...' : 'Start Download';
}

interface Props {
  ready: boolean;
}

const File: React.FC<Props> = props => {
  const web3TorrentClient = useContext(Web3TorrentClientContext);

  const {infoHash} = useParams();
  const queryParams = useQuery();
  const [loading, setLoading] = useState(false);
  const [errorLabel, setErrorLabel] = useState('');
  const [warning, setWarning] = useState('');
  const [channels, setChannels] = useState(undefined);
  const torrentName = queryParams.get('name');
  const torrentLength = Number(queryParams.get('length'));

  const [torrent, setTorrent] = useState<TorrentUI>(() =>
    getTorrentUI(web3TorrentClient, {
      infoHash,
      name: torrentName,
      length: torrentLength
    })
  );

  useEffect(() => {
    const onTorrentUpdate = () =>
      setTorrent(
        getTorrentUI(web3TorrentClient, {
          infoHash,
          name: torrentName,
          length: torrentLength
        })
      );

    const MAX_FPS = 10;
    const subscription = new Observable(subscriber => {
      web3TorrentClient.addListener(
        WebTorrentPaidStreamingClient.torrentUpdatedEventName(infoHash),
        event => subscriber.next(event)
      );
    })
      .pipe(throttleTime(1_000 / MAX_FPS, undefined, {trailing: true, leading: false}))
      .subscribe(onTorrentUpdate);

    // It is not clear why optional chaining is needed.
    return () => {
      try {
        subscription.unsubscribe();
      } catch (e) {
        log.info('Unable to unsubscribe');
      }
    };
  }, [infoHash, torrentLength, torrentName, web3TorrentClient]);

  useEffect(() => {
    const testResult = async () => {
      const torrentCheckResult = await checkTorrent(infoHash);
      setWarning(torrentCheckResult);
    };

    if (infoHash) {
      testResult();
    }
  }, [infoHash]);

  useEffect(() => {
    if (props.ready) {
      web3TorrentClient.paymentChannelClient.getChannels().then(channels => setChannels(channels));
    }
  }, [props.ready, web3TorrentClient.paymentChannelClient]);

  const {mySigningAddress: me} = web3TorrentClient.paymentChannelClient;
  const {budget, closeBudget, getBudget} = useBudget(props);
  const showBudget = budget?.budgets?.length;

  return (
    <section className="section fill download">
      <div className="jumbotron-upload">
        <h1>{torrent.originalSeed ? 'Upload a File' : 'Download a File'}</h1>
      </div>
      <TorrentInfo torrent={torrent} channelCache={channels} mySigningAddress={me} />
      {warning &&
        ((!torrent.uploaded && torrent.status === Status.Seeding) ||
          torrent.status === Status.Idle) && (
          <div className="warning-wrapper">
            <Flash variant="danger">{warning}</Flash>
          </div>
        )}
      <br />
      {showBudget && (
        <DomainBudget
          budgetCache={budget}
          channelCache={channels}
          mySigningAddress={me}
          withdraw={closeBudget}
        />
      )}
      {(torrent.status === Status.Idle || torrent.status === Status.Paused) && (
        <>
          <FormButton
            name="download"
            spinner={loading}
            disabled={!props.ready || loading}
            onClick={async () => {
              track('Torrent Started', {
                infoHash,
                magnetURI: torrent.magnetURI,
                filename: torrentName,
                filesize: torrentLength
              });
              setLoading(true);
              setErrorLabel('');
              try {
                await download(torrent.magnetURI);
                await getBudget();
              } catch (error) {
                setLoading(false);
                setErrorLabel(getUserFriendlyError(error.code));
              }
              setLoading(false);
            }}
          >
            {buttonLabel(loading)}
          </FormButton>
          {errorLabel && errorLabel !== '' && <Flash variant="danger">{errorLabel}</Flash>}
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
            <p>
              <strong>Why can't I connect to a peer?</strong>
              <br />
              It's possible that your browser is blocking connections to our tracker, or to peers.
              Please disable any extensions which force HTTPS or potentially limit the WebRTC
              protocol.
            </p>
          </div>
        </>
      )}
    </section>
  );
};

export default File;
