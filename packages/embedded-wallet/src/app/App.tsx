import React from "react";
import { JsonRpcRoute as Route, JsonRpcRouter as Router } from "../json-rpc-router";
import { BudgetAllocation } from "../message-handlers";

const App: React.FC = () => {
  return (
    <Router>
      <Route method="chan_allocate" component={BudgetAllocation} />
    </Router>
  );
};

export default App;
