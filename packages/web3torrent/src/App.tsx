import * as Sentry from '@sentry/browser';
import ConnectionBanner from '@rimble/connection-banner';
import React, {useState, useEffect} from 'react';
import {Route, Switch, BrowserRouter} from 'react-router-dom';
import './App.scss';
import {LayoutFooter, LayoutHeader} from './components/layout';
import Welcome from './pages/welcome/Welcome';
import {Flash, Link} from 'rimble-ui';
import File from './pages/file/File';
import Upload from './pages/upload/Upload';
import {RoutePath} from './routes';
import {requiredNetwork, INITIAL_BUDGET_AMOUNT} from './constants';
import {Budgets} from './pages/budgets/Budgets';
import {web3TorrentClient} from './clients/web3torrent-client';
import {identify} from './analytics';
import {providers} from 'ethers';
import {utils} from 'ethers';

const App: React.FC = () => {
  const [currentNetwork, setCurrentNetwork] = useState(
    window.ethereum ? Number(window.ethereum.networkVersion) : undefined
  );

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    web3TorrentClient.paymentChannelClient.initialize().then(() => {
      setInitialized(true);
      if (process.env.NODE_ENV === 'production') {
        Sentry.configureScope(scope => {
          scope.setUser({id: web3TorrentClient.paymentChannelClient.mySigningAddress});
        });
        identify(web3TorrentClient.paymentChannelClient.mySigningAddress, {
          outcomeAddress: web3TorrentClient.paymentChannelClient.myEthereumSelectedAddress
        });
      }
    });
  }, [initialized]);
  const [selectedAddress, setSelectedAddress] = useState(undefined);
  useEffect(() => {
    if (window.ethereum) {
      setSelectedAddress(window.ethereum.selectedAddress);
    }
  }, []);

  useEffect(() => {
    if (window.ethereum && typeof window.ethereum.on === 'function') {
      const networkChangeListener = chainId => setCurrentNetwork(Number(chainId));
      const addressChangeListener = accounts => {
        console.log(accounts[0]);
        setSelectedAddress(accounts[0]);
      };
      window.ethereum.on('networkChanged', networkChangeListener);
      window.ethereum.on('accountsChanged', addressChangeListener);
      return () => {
        window.ethereum.removeListener('networkChanged', networkChangeListener);
        window.ethereum.removeListener('accountsChanged', addressChangeListener);
      };
    }
    return () => ({});
  }, []);

  const ready = currentNetwork === requiredNetwork && initialized;

  const [balance, setBalance] = useState(undefined);
  useEffect(() => {
    const getBalance = async () => {
      if (selectedAddress) {
        const provider = new providers.Web3Provider(window.ethereum);
        const balance = await provider.getBalance(selectedAddress);
        setBalance(balance);
      }
    };

    getBalance();
  }, [ready, selectedAddress]);

  return (
    <BrowserRouter>
      <main>
        <ConnectionBanner
          currentNetwork={currentNetwork}
          requiredNetwork={requiredNetwork}
          onWeb3Fallback={!('ethereum' in window)}
        />
        {ready && balance && balance.lt(INITIAL_BUDGET_AMOUNT) && (
          <Flash my={3} variant="warning">
            You currently have {utils.formatEther(balance)} ETH in your wallet. You'll need at least{' '}
            {utils.formatEther(INITIAL_BUDGET_AMOUNT)} ETH in your wallet to fund Web3Torrent. You
            can get more ETH{' '}
            <Link target="_blank" href={`https://faucet.ropsten.be/`}>
              here.
            </Link>
          </Flash>
        )}
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
