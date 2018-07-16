import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';

import './App.css';
import Header from './components/Header';
import HomePageContainer from './components/HomePage';
import HowItWorksPage from './components/HowItWorksPage';
import GameContainer from './containers/GameContainer';
import AboutPage from './components/AboutPage';
import { ROUTE_PATHS } from './constants';

export default function App() {
  return (
    <BrowserRouter>
      <div className="font">
        <header>
          <Header />
        </header>
        <Route exact path="/" component={HomePageContainer} />
        <Route path={`/${ROUTE_PATHS.HOW_IT_WORKS}`} component={HowItWorksPage} />
        <Route path={`/${ROUTE_PATHS.PLAY}`} component={GameContainer} />
        <Route path={`/${ROUTE_PATHS.ABOUT}`} component={AboutPage} />
      </div>
    </BrowserRouter>
  );
}
