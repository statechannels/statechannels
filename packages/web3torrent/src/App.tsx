import ConnectionBanner from '@rimble/connection-banner';
import {Flash} from 'rimble-ui';
import {createBrowserHistory} from 'history';
import React from 'react';
import {Route, Router, Switch} from 'react-router-dom';
import './App.scss';
import {LayoutFooter, LayoutHeader} from './components/layout';
import Welcome from './pages/welcome/Welcome';

import File from './pages/file/File';
import Upload from './pages/upload/Upload';
import {RoutePath} from './routes';
import {Web3TorrentContext} from './clients/web3torrent-client';
import {TorrentClientCapabilities, ClientEvents} from './library/types';

const history = createBrowserHistory();
class App extends React.Component {
  state = {
    currentNetwork: 'ethereum' in window && Number(window.ethereum.networkVersion),
    requiredNetwork: Number(process.env.REACT_APP_CHAIN_NETWORK_ID),
    canTorrent: true,
    showNetworkWarning: false
  };

  static contextType = Web3TorrentContext;

  // Adds typing information to this.context
  context!: React.ContextType<typeof Web3TorrentContext>;

  constructor(props) {
    super(props);
    this.updateState = this.updateState.bind(this);
  }

  updateState() {
    this.setState({
      ...this.state,
      showNetworkWarning: this.context.clientCapability === TorrentClientCapabilities.NOT_CAPABLE,
      currentNetwork: Number(window.ethereum.networkVersion)
    });
  }

  componentDidMount() {
    this.context.on(ClientEvents.CLIENT_CAPABILITY_TEST, this.updateState);
    if ('ethereum' in window) {
      this.setState({...this.state, currentNetwork: Number(window.ethereum.networkVersion)});
      window.ethereum.on('networkChanged', this.updateState);
    }
  }

  componentWillUnmount() {
    this.context.off(ClientEvents.CLIENT_CAPABILITY_TEST, this.updateState);
  }

  render() {
    const {currentNetwork, requiredNetwork, showNetworkWarning} = this.state;
    const ready = currentNetwork === requiredNetwork;

    return (
      <Router history={history}>
        <main>
          {showNetworkWarning && (
            <Flash variant="danger">
              Looks like you do not have an internet connection or are behind a firewall.
              Web3Torrent may not work on some public wifi networks.
            </Flash>
          )}
          <ConnectionBanner
            currentNetwork={Number(currentNetwork)}
            requiredNetwork={Number(requiredNetwork)}
            onWeb3Fallback={!('ethereum' in window)}
          />
          <Route path={RoutePath.Root} render={props => <LayoutHeader {...props} />} />
          <Switch>
            <Route
              exact
              path={RoutePath.Root}
              render={props => <Welcome {...props} ready={ready} />}
            />
            <Route
              exact
              path={RoutePath.File}
              render={props => <File {...props} ready={ready} />}
            />
            <Route
              exact
              path={RoutePath.Upload}
              render={props => <Upload {...props} ready={ready} />}
            />
          </Switch>
        </main>
        <Route path={RoutePath.Root} component={LayoutFooter} />
      </Router>
    );
  }
}

export default App;
