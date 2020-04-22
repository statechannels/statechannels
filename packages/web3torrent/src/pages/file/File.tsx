import React, {useState, useContext, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {download, Web3TorrentContext} from '../../clients/web3torrent-client';
import {FormButton} from '../../components/form';
import {TorrentInfo} from '../../components/torrent-info/TorrentInfo';
import {SiteBudgetTable} from '../../components/site-budget-table/SiteBudgetTable';
import {Status, TorrentUI} from '../../types';
import {useQuery} from '../../utils/url';
import {getTorrentUI} from '../../utils/torrent-status-checker';
import './File.scss';
import {TorrentTestResult} from '../../library/web3torrent-lib';
import _ from 'lodash';
import {Flash} from 'rimble-ui';
import {checkTorrentInTracker} from '../../utils/check-torrent-in-tracker';
import {getUserFriendlyError} from '../../utils/error';

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
  const web3Torrent = useContext(Web3TorrentContext);
  const {infoHash} = useParams();
  const queryParams = useQuery();
  const [loading, setLoading] = useState(false);
  const [errorLabel, setErrorLabel] = useState('');
  const [warning, setWarning] = useState('');
  const torrentName = queryParams.get('name');
  const torrentLength = Number(queryParams.get('length'));

  const [torrent, setTorrent] = useState<TorrentUI>(() =>
    getTorrentUI(web3Torrent, {
      infoHash,
      name: torrentName,
      length: torrentLength
    })
  );

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
    if (torrent.status !== Status.Idle || !!torrent.originalSeed) {
      const cancelId = setTimeout(
        () =>
          setTorrent(
            getTorrentUI(web3Torrent, {
              infoHash,
              name: torrentName,
              length: torrentLength
            })
          ),
        1000
      );
      return () => clearTimeout(cancelId);
    }
    return undefined;
  }, [torrent, infoHash, torrentName, torrentLength, web3Torrent]);

  const {channelCache, budgetCache, mySigningAddress: me} = web3Torrent.paymentChannelClient;
  // TODO: We shouldn't have to check all these different conditions
  const showBudget =
    !!budgetCache &&
    !_.isEmpty(budgetCache) &&
    !!budgetCache.budgets &&
    budgetCache.budgets.length > 0;

  return (
    <section className="section fill download">
      <div className="jumbotron-upload">
        <h1>{torrent.originalSeed ? 'Upload a File' : 'Download a File'}</h1>
      </div>
      <TorrentInfo torrent={torrent} channelCache={channelCache} mySigningAddress={me} />
      {warning &&
        ((!torrent.uploaded && torrent.status === Status.Seeding) ||
          torrent.status === Status.Idle) && (
          <div className="warning-wrapper">
            <Flash variant="danger">{warning}</Flash>
          </div>
        )}
      <br />
      {showBudget && (
        <SiteBudgetTable
          budgetCache={budgetCache}
          channelCache={channelCache}
          mySigningAddress={me}
        />
      )}
      {torrent.status === Status.Idle && (
        <>
          <FormButton
            name="download"
            spinner={loading}
            disabled={!props.ready || loading}
            onClick={async () => {
              setLoading(true);
              setErrorLabel('');
              try {
                await download(torrent.magnetURI);
                setTorrent(
                  getTorrentUI(web3Torrent, {
                    infoHash,
                    name: torrentName,
                    length: torrentLength
                  })
                );
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
          </div>
        </>
      )}
    </section>
  );
};

export default File;
