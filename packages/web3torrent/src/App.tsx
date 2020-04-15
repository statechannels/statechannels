import ConnectionBanner from '@rimble/connection-banner';
import {Flash} from 'rimble-ui';
import React, {useState, useContext, useEffect} from 'react';
import {Route, Switch, BrowserRouter} from 'react-router-dom';
import './App.scss';
import {LayoutFooter, LayoutHeader} from './components/layout';
import Welcome from './pages/welcome/Welcome';

import File from './pages/file/File';
import Upload from './pages/upload/Upload';
import {RoutePath} from './routes';
import {Web3TorrentContext} from './clients/web3torrent-client';
import {TorrentClientCapabilities} from './library/types';
import {requiredNetwork} from './constants';

const App: React.FC = () => {
  const Web3Torrent = useContext(Web3TorrentContext);
  const [currentNetwork, setCurrentNetwork] = useState(
    window.ethereum ? Number(window.ethereum.networkVersion) : undefined
  );

  useEffect(() => {
    if (window.ethereum) {
      const listener = chainId => setCurrentNetwork(Number(chainId));
      window.ethereum.on('networkChanged', listener);
      return () => {
        window.ethereum.removeListener('networkChanged', listener);
      };
    }
    return () => ({});
  }, []);

  const ready = currentNetwork === requiredNetwork;
  const showNetworkWarning = Web3Torrent.clientCapability === TorrentClientCapabilities.NOT_CAPABLE;
  return (
    <BrowserRouter>
      <main>
        {showNetworkWarning && (
          <Flash variant="danger">
            Looks like you do not have an internet connection or are behind a firewall. Web3Torrent
            may not work on some public wifi networks.
          </Flash>
        )}
        <ConnectionBanner
          currentNetwork={currentNetwork}
          requiredNetwork={requiredNetwork}
          onWeb3Fallback={!('ethereum' in window)}
        />
        <Route path={RoutePath.Root}>
          <LayoutHeader />
        </Route>
        <Switch>
          <Route exact path={RoutePath.Root}>
            <Welcome ready={ready} />
          </Route>
          <Route exact path={RoutePath.FileWithInfoHash}>
            <File ready={ready} />
          </Route>
          } />
          <Route exact path={RoutePath.Upload}>
            <Upload ready={ready} />
          </Route>
          />
        </Switch>
      </main>
      <Route path={RoutePath.Root} component={LayoutFooter} />
    </BrowserRouter>
  );
};

export default App;
