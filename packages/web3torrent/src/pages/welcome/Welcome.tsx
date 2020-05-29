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

const Welcome: React.FC<Props> = props => {
  const history = useHistory();

  return (
    <section className="section fill">
      <div className="jumbotron">
        <h1>Streaming file transfer over WebTorrent</h1>
        <h2>TORRENTS ON THE WEB</h2>
      </div>
      <div className="subtitle">
        <p>
          Web3Torrent offers a new experience for sharing files in a decentralized way via paid
          streaming, bringing together{' '}
          <a href="https://statechannels.org" target="_blank" rel="noopener noreferrer">
            State Channels
          </a>{' '}
          and{' '}
          <a href="https://webtorrent.io/" target="_blank" rel="noopener noreferrer">
            WebTorrent
          </a>
          , a JavaScript implementation of the BitTorrent protocol.
        </p>
      </div>
      <h2>Download a sample file</h2>
      <ShareList torrents={preseededTorrentsUI} />
      <h2>Or share a file</h2>
      <FormButton
        name="upload"
        block={true}
        disabled={!props.ready}
        onClick={() => history.push(RoutePath.Upload)}
      >
        Upload
      </FormButton>
    </section>
  );
};

export default Welcome;
