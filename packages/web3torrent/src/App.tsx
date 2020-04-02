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
import {WebTorrentContext} from './clients/web3torrent-client';

const history = createBrowserHistory();
class App extends React.Component {
  state = {
    currentNetwork: 'ethereum' in window && Number(window.ethereum.networkVersion),
    requiredNetwork: Number(process.env.REACT_APP_CHAIN_NETWORK_ID),
    canTorrent: true
  };

  static contextType = WebTorrentContext;

  // Adds typing information to this.context
  context!: React.ContextType<typeof WebTorrentContext>;

  async componentDidMount() {
    if ('ethereum' in window) {
      this.setState({...this.state, currentNetwork: Number(window.ethereum.networkVersion)});
      window.ethereum.on('networkChanged', chainId => {
        this.setState({...this.state, currentNetwork: Number(chainId)});
      });
    }
    this.setState({...this.state, canTorrent: await this.context.testTorrentingCapability(3000)});
  }

  render() {
    const {currentNetwork, requiredNetwork, canTorrent} = this.state;
    const ready = currentNetwork === requiredNetwork;
    return (
      <Router history={history}>
        <main>
          {!canTorrent && (
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
