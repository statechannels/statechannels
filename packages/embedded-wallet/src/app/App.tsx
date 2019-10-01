import React from 'react';
import {OnboardingFlow} from '../flows';
import {JsonRpcRoute as Route, JsonRpcRouter as Router} from '../json-rpc-router';

const App: React.FC = () => {
  return (
    <Router>
      <Route method="chan_allocate" component={OnboardingFlow} />
    </Router>
  );
};

export default App;
