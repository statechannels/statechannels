import React from "react";
import { JsonRpcRoute as Route, JsonRpcRouter as Router } from "../json-rpc-router";
import { TestMessage } from "../message-handlers/TestMessage";
import { UnicornMessage } from "../message-handlers/UnicornMessage";

const App: React.FC = () => {
  return (
    <Router>
      <Route method="chan_test" component={TestMessage} />
      <Route method="chan_unicorn" component={UnicornMessage} />
    </Router>
  );
};

export default App;
