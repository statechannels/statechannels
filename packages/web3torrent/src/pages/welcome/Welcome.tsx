import debug from 'debug';
import React from 'react';
import {RouteComponentProps} from 'react-router-dom';
import {FormButton} from '../../components/form';
import {ShareList} from '../../components/share-list/ShareList';
import {preSeededTorrents, defaultTrackers} from '../../constants';
import {RoutePath} from '../../routes';
import './Welcome.scss';
import {Client} from 'bittorrent-tracker';
import {Web3TorrentContext, web3torrent} from '../../clients/web3torrent-client';

const log = debug('web3torrent:welcome-page-tracker-client');

const requiredOpts = {
  infoHash: ['c53da4fa28aa2edc1faa91861cce38527414d874'], // Sintel.mp4 concentrate on this torrent for now
  peerId: '2d5757303030372d37454e613073307937495630', // hex string or Buffer
  announce: defaultTrackers, // list of tracker server urls,
  port: 6881 // torrent client port, (in browser, optional)
};
const optionalOpts = {
  getAnnounceOpts: () => ({pseAccount: '0x7F0126D6c4270498b6514Cb934a3274898f68777'}) // dummy pseAccount, but it works
};

interface Props {
  ready: boolean;
}

class Welcome extends React.Component<RouteComponentProps & Props, {[infoHash: string]: boolean}> {
  trackerClient: Client; // bittorrent tracker client
  state = {c53da4fa28aa2edc1faa91861cce38527414d874: false}; // do not display by default

  updateIfSeederFound(data: any) {
    log('got an announce response from tracker: ' + data.announce);
    if (data.complete > 0) {
      // there are some seeders for this torrent
      this.setState({[requiredOpts.infoHash[0]]: true});
      // this torrent should be displayed
      log(`Seeder found for ${requiredOpts.infoHash[0]}`);
    }
  }

  constructor(props) {
    super(props);
    this.trackerClient = new Client({...requiredOpts, ...optionalOpts});
    this.updateIfSeederFound = this.updateIfSeederFound.bind(this);
    this.trackerClient.on('update', this.updateIfSeederFound);
    this.trackerClient.start();
  }

  componentWillUnmount() {
    this.trackerClient.off('update', this.updateIfSeederFound);
    this.trackerClient.stop();
    this.trackerClient.destroy();
  }

  async componentWillMount() {
    await web3torrent.paymentChannelClient.enable();
  }

  render() {
    const {history, ready} = this.props;
    return (
      <section className="section fill">
        <div className="jumbotron">
          <h1>Streaming file transfer over WebTorrent</h1>
          <h2>TORRENTS ON THE WEB</h2>
        </div>
        <Web3TorrentContext.Consumer>
          {w3 => {
            return (
              <>
                <FormButton
                  name="withdraw"
                  block={true}
                  disabled={!ready}
                  onClick={async () => w3.paymentChannelClient.closeAndWithdraw()}
                ></FormButton>
              </>
            );
          }}
        </Web3TorrentContext.Consumer>
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
