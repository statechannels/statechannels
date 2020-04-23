import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

import {OmniProvider} from './contexts/omni-provider';

ReactDOM.render(
  <OmniProvider>
    <App />
  </OmniProvider>,
  document.getElementById('root')
);
