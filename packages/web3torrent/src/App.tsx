import {createBrowserHistory} from 'history';
import React from 'react';
import {Route, Router, Switch} from 'react-router-dom';
import './App.scss';
import {LayoutFooter, LayoutHeader} from './components/layout';
import Welcome from './pages/welcome/Welcome';

import File from './pages/file/File';
import Upload from './pages/upload/Upload';
import {RoutePath} from './routes';

const history = createBrowserHistory();
class App extends React.Component {
  state = {
    currentNetwork: parseInt(window.ethereum.chainId, 16),
    requiredNetwork: Number(process.env.REACT_APP_CHAIN_NETWORK_ID)
  };

  componentDidMount() {
    window.ethereum.on('networkChanged', chainId => {
      this.setState({...this.state, currentNetwork: parseInt(chainId, 16)});
    });
  }

  render() {
    const {currentNetwork, requiredNetwork} = this.state;
    return (
      <Router history={history}>
        <main>
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
