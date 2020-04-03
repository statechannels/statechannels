import debug from 'debug';
import React from 'react';
import {RouteComponentProps} from 'react-router-dom';
import {FormButton} from '../../components/form';
import {ShareList} from '../../components/share-list/ShareList';
import {preSeededTorrents, welcomePageTrackerOpts} from '../../constants';
import {RoutePath} from '../../routes';
import './Welcome.scss';
import {Client} from 'bittorrent-tracker';

const log = debug('web3torrent:welcome-page-tracker-client');

interface Props {
  ready: boolean;
}

class Welcome extends React.Component<RouteComponentProps & Props, {[infoHash: string]: boolean}> {
  trackerClient: Client; // bittorrent tracker client
  state = {[preSeededTorrents[0].infoHash]: false}; // do not display by default

  updateIfSeederFound(data: any) {
    log('got an announce response from tracker: ', data);
    if (data.complete > 0) {
      // there are some seeders for this torrent
      this.setState({[preSeededTorrents[0].infoHash]: true});
      // this torrent should be displayed
      log(`Seeder found for ${preSeededTorrents[0].infoHash}`);
    }
  }

  constructor(props) {
    super(props);
    this.trackerClient = new Client(welcomePageTrackerOpts);
    this.updateIfSeederFound = this.updateIfSeederFound.bind(this);
    this.trackerClient.on('update', this.updateIfSeederFound);
    this.trackerClient.start();
  }

  componentWillUnmount() {
    this.trackerClient.off('update', this.updateIfSeederFound);
    this.trackerClient.stop();
    this.trackerClient.destroy();
  }

  render() {
    const {history, ready} = this.props;
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
        <ShareList
          torrents={preSeededTorrents.filter(torrent => this.state[torrent.infoHash])}
          history={history}
        />
        <h2>Or share a file</h2>
        <FormButton
          name="upload"
          block={true}
          disabled={!ready}
          onClick={() => history.push(RoutePath.Upload)}
        >
          Upload
        </FormButton>
      </section>
    );
  }
}

export default Welcome;
