import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';

import './App.css';
import Header from './components/Header';
import HomePage from './components/HomePage';
import HowItWorksPage from './components/HowItWorksPage';
import AboutPage from './components/AboutPage';
import { ROUTE_PATHS } from './constants';

class App extends React.Component {
  render() {
    return (
      <BrowserRouter>
        <div className="font">
          <header>
            <Header />
          </header>
          <Route exact path="/" component={HomePage} />
          <Route path={`/${ROUTE_PATHS.HOW_IT_WORKS}`} component={HowItWorksPage} />
          <Route path={`/${ROUTE_PATHS.ABOUT}`} component={AboutPage} />
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
