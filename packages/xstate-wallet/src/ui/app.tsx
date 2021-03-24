import React from 'react';
import {Route, Switch, BrowserRouter} from 'react-router-dom';
import {ChannelWallet} from '../channel-wallet';
import {FactoryReset} from './factory-reset';

enum RoutePath {
  Root = '/',
  FactoryReset = '/factory-reset/'
}

interface Props {
  wallet: ChannelWallet;
}

const App = (props: Props) => (
  <BrowserRouter>
    <main>
      <Switch>
        <Route exact path={RoutePath.Root}></Route>
        <Route exact path={RoutePath.FactoryReset}>
          <FactoryReset store={(props.wallet as any).store}></FactoryReset>
        </Route>
      </Switch>
    </main>
  </BrowserRouter>
);

export default App;
