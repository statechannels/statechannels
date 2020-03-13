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
    currentNetwork:
      'ethereum' in window && window.ethereum.chainId && parseInt(window.ethereum.chainId, 16),
    requiredNetwork: Number(process.env.REACT_APP_CHAIN_NETWORK_ID),
    canTorrent: true
  };

  static contextType = WebTorrentContext;

  async componentDidMount() {
    'ethereum' in window &&
      window.ethereum.on('networkChanged', chainId => {
        this.setState({...this.state, currentNetwork: parseInt(chainId, 16)});
      });
    await this.context.enable();
    this.setState({...this.state, canTorrent: await this.context.testTorrentingCapability(3000)});
  }

  render() {
    const {currentNetwork, requiredNetwork, canTorrent} = this.state;
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
            currentNetwork={currentNetwork}
            requiredNetwork={requiredNetwork}
            onWeb3Fallback={!('ethereum' in window)}
          />
          <Route
            path={RoutePath.Root}
            render={props => (
              <LayoutHeader
                {...props}
                currentNetwork={currentNetwork}
                requiredNetwork={requiredNetwork}
              />
            )}
          />
          <Switch>
            <Route
              exact
              path={RoutePath.Root}
              render={props => (
                <Welcome
                  {...props}
                  currentNetwork={currentNetwork}
                  requiredNetwork={requiredNetwork}
                />
              )}
            />
            <Route
              exact
              path={RoutePath.File}
              render={props => (
                <File
                  {...props}
                  currentNetwork={currentNetwork}
                  requiredNetwork={requiredNetwork}
                />
              )}
            />
            <Route
              exact
              path={RoutePath.Upload}
              render={props => (
                <Upload
                  {...props}
                  currentNetwork={currentNetwork}
                  requiredNetwork={requiredNetwork}
                />
              )}
            />
          </Switch>
        </main>
        <Route path={RoutePath.Root} component={LayoutFooter} />
      </Router>
    );
  }
}

export default App;
