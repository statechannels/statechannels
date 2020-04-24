import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import {ContextProvider} from './context/context-provider';
import {MockContextProvider} from './library/testing/mock-context-provider';

it('renders app without crashing', () => {
  const div = document.createElement('div');

  ReactDOM.render(
    <MockContextProvider>
      <App />
    </MockContextProvider>,
    div
  );

  ReactDOM.unmountComponentAtNode(div);
});
