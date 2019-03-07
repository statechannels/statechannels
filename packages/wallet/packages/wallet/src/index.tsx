import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

// Not adding in currently because it breaks most of our existing components
// import 'bootstrap/dist/css/bootstrap.min.css';
import './index.scss';
import store from './redux/store';
import WalletContainer from './containers/Wallet';
render(
  <Provider store={store}>
    <WalletContainer />
  </Provider>,
  document.getElementById('root'),
);
