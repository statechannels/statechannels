import React from 'react';
import {useHistory} from 'react-router-dom';
import {FormButton} from '../../components/form';
import {ShareList} from '../../components/share-list/ShareList';
import {preseededTorrentsUI} from '../../constants';
import {RoutePath} from '../../routes';
import './Welcome.scss';
import {generateURL} from '../../utils/url';

interface Props {
  ready: boolean;
}

const Welcome: React.FC<Props> = () => {
  const history = useHistory();

  return (
    <section className="section fill">
      <div className="jumbotron">
        <h1>Peer-to-peer file sharing</h1>
        <h2>WITH MICROPAYMENTS</h2>
      </div>
      <div className="subtitle">
        <p>
          Web3Torrent brings crypto payments to the torrenting world. <br />
          Under the hood it uses a paid-streaming extension to the{' '}
          <a href="https://webtorrent.io/" target="_blank" rel="noopener noreferrer">
            WebTorrent
          </a>{' '}
          client, and uses{' '}
          <a href="https://statechannels.org" target="_blank" rel="noopener noreferrer">
            State Channels
          </a>{' '}
          technology to achieve seamless value transfer on the ethereum blockchain. Peers can share
          files in a torrent swarm and downloaders make micropayments to uploaders for the data they
          provide.
        </p>
      </div>
      <div className="actions-container">
        <FormButton
          className="button pulse"
          name="download"
          onClick={() => history.push(generateURL(preseededTorrentsUI[0]))}
        >
          Download a sample file
        </FormButton>
        <FormButton name="download" onClick={() => history.push(RoutePath.Upload)}>
          Upload your own file
        </FormButton>
      </div>
    </section>
  );
};

export default Welcome;
