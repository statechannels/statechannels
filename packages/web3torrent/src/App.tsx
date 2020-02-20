import {createBrowserHistory} from 'history';
import React from 'react';
import {Route, Router, Switch} from 'react-router-dom';
import './App.scss';
import {LayoutFooter, LayoutHeader} from './components/layout';
import Welcome from './pages/welcome/Welcome';

import File from './pages/file/File';
import Upload from './pages/upload/Upload';
import {RoutePath} from './routes';
import ConnectionBanner from '@rimble/connection-banner';

class App extends React.Component {
  state = {currentNetwork: parseInt(window.ethereum.chainId, 16)};

  componentDidMount() {
    window.ethereum.on('networkChanged', chainId => {
      this.setState({currentNetwork: parseInt(chainId, 16)});
    });
  }

  render() {
    const history = createBrowserHistory();
    return (
      <Router history={history}>
        <main>
          <ConnectionBanner
            currentNetwork={this.state.currentNetwork}
            requiredNetwork={Number(process.env.REACT_APP_CHAIN_NETWORK_ID)}
            onWeb3Fallback={false}
          />
          <Route path={RoutePath.Root} component={LayoutHeader} />
          <Switch>
            <Route exact path={RoutePath.Root} component={Welcome} />
            <Route exact path={RoutePath.File} component={File} />
            <Route exact path={RoutePath.Upload} component={Upload} />
          </Switch>
        </main>
        <Route path={RoutePath.Root} component={LayoutFooter} />
      </Router>
    );
  }
}
export default App;
