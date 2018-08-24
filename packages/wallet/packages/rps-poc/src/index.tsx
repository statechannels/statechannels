import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

import './index.css';
import registerServiceWorker from './registerServiceWorker';
import store from './redux/store';
import AppContainer from './AppContainer';

render(
  <Provider store={store}>
    <AppContainer />
  </Provider>,
  document.getElementById('root'),
);
registerServiceWorker();
