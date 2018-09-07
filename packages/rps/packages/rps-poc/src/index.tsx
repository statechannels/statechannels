import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

// Not adding in currently because it breaks most of our existing components
// import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import './App.css';
import registerServiceWorker from './registerServiceWorker';
import store from './redux/store';
import SiteContainer from './containers/SiteContainer';

render(
  <Provider store={store}>
    <SiteContainer />
  </Provider>,
  document.getElementById('root'),
);
registerServiceWorker();
