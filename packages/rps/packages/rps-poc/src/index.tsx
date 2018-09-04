import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

// Not adding in currently because it breaks most of our existing components
// import 'bootstrap/dist/css/bootstrap.min.css';
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
