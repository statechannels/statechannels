import React from "react";
import { JsonRpcRoute as Route, JsonRpcRouter as Router } from "../json-rpc-router";
import { BudgetAllocation, ConnectToHub, NoHub } from "../message-handlers";

const App: React.FC = () => {
  return (
    <Router>
      <Route method="chan_allocate" component={BudgetAllocation} />
      <Route method="chan_noHub" component={NoHub} />
      <Route method="chan_connect" component={ConnectToHub} />
    </Router>
  );
};

export default App;
