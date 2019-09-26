import { createBrowserHistory } from "history";
import React from "react";
import { Route, Router, Switch } from "react-router-dom";
import "./App.scss";
import { LayoutFooter, LayoutHeader } from "./components/layout";
import Welcome from "./pages/welcome/Welcome";

import { RoutePath } from "./routes";

const App: React.FC = () => {
  const history = createBrowserHistory();
  return (
    <Router history={history}>
      <main className="wrapper__content">
        <Switch>
          <Route exact path={RoutePath.Root} component={LayoutHeader} />
        </Switch>
        <Switch>
          <Route exact path={RoutePath.Root} component={Welcome} />
        </Switch>
      </main>
      <Switch>
        <Route exact path={RoutePath.Root} component={LayoutFooter} />
      </Switch>
    </Router>
  );
};
export default App;
