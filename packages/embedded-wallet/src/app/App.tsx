import React from "react";
import { JsonRpcRoute as Route, JsonRpcRouter as Router } from "../json-rpc-router";
import { BudgetAllocation, NoHub } from "../message-handlers";

const App: React.FC = () => {
  return (
    <Router>
      <Route method="chan_allocate" component={BudgetAllocation} />
      <Route method="chan_noHub" component={NoHub} />
    </Router>
  );
};

export default App;
