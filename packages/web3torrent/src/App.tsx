import {createBrowserHistory} from 'history';
import React from 'react';
import {Route, Router, Switch} from 'react-router-dom';
import './App.scss';
import {LayoutFooter, LayoutHeader} from './components/layout';
import Welcome from './pages/welcome/Welcome';

import File from './pages/file/File';
import Upload from './pages/upload/Upload';
import {RoutePath} from './routes';

// [ George ] Here we could insert a new landing page, with a Rimble connection banner and "Connect with Metamask + State Channels" button. We then await calls to channelClient.getAddress() and channelClient.getEthereumSelectedAddress() before progressing to the Welcome page.

const App: React.FC = () => {
  const history = createBrowserHistory();
  return (
    <Router history={history}>
      <main>
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
};
export default App;
