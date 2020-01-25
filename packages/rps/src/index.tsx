import * as React from 'react';
import {render} from 'react-dom';
import {Provider} from 'react-redux';
import * as Sentry from '@sentry/browser';

// Not adding in currently because it breaks most of our existing components
// import 'bootstrap/dist/css/bootstrap.min.css';
import './index.scss';
import store from './redux/store';
import SiteContainer from './containers/SiteContainer';

Sentry.init({dsn: 'https://db92051c360145b4b3537d33881c1bc3@sentry.io/1913622'});

render(
  <Provider store={store}>
    <div style={{width: '100%'}}>
      <SiteContainer />
    </div>
  </Provider>,
  document.getElementById('root')
);
