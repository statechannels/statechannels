import ConnectionBanner from '@rimble/connection-banner';
import React, {useState, useEffect, useContext} from 'react';
import {Route, Switch, BrowserRouter} from 'react-router-dom';
import './App.scss';
import {LayoutFooter, LayoutHeader} from './components/layout';
import Welcome from './pages/welcome/Welcome';

import File from './pages/file/File';
import Upload from './pages/upload/Upload';
import {RoutePath} from './routes';
import {requiredNetwork} from './constants';
import {Budgets} from './pages/budgets/Budgets';
import {ClientInitializationContext} from './context/client-initialization-context';

const App: React.FC = () => {
  const [currentNetwork, setCurrentNetwork] = useState(
    window.ethereum ? Number(window.ethereum.networkVersion) : undefined
  );

  const {initializationStatus, initialize} = useContext(ClientInitializationContext);
  useEffect(() => {
    if (initializationStatus === 'Not Initialized') {
      initialize();
    }
  });

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

  const ready = currentNetwork === requiredNetwork && initializationStatus === 'Initialized';

  return (
    <BrowserRouter>
      <main>
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
          <Route exact path={RoutePath.Budgets}>
            <Budgets ready={ready} />
          </Route>
          />
        </Switch>
      </main>
      <Route path={RoutePath.Root} component={LayoutFooter} />
    </BrowserRouter>
  );
};

export default App;
