import React from 'react';
import {useHistory} from 'react-router-dom';
import {FormButton} from '../../components/form';
import {ShareList} from '../../components/share-list/ShareList';
import {preseededTorrentsUI} from '../../constants';
import {RoutePath} from '../../routes';
import './Welcome.scss';

interface Props {
  ready: boolean;
}

const Welcome: React.FC<Props> = () => {
  const history = useHistory();

  return (
    <section className="section fill">
      <div className="jumbotron">
        <h1>Streaming file transfer over WebTorrent</h1>
        <h2>TORRENTS ON THE WEB</h2>
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
      <h2>Download a sample file</h2>
      <ShareList torrents={preseededTorrentsUI} />
      <h2>Or share a file</h2>
      <FormButton
        name="upload"
        block={true}
        disabled={false}
        onClick={() => history.push(RoutePath.Upload)}
      >
        Upload
      </FormButton>
    </section>
  );
};

export default Welcome;
