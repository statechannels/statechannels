import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';

import './App.css';
import Header from './components/Header';
import HomePageContainer from './containers/HomePageContainer';
import HowItWorksPage from './components/HowItWorksPage';
import GameContainer from './containers/GameContainer';
import AboutPage from './components/AboutPage';
import { ROUTE_PATHS } from './constants';
import PrivateRoute from './components/PrivateRoute';

export interface AppProps {
  isAuthenticated: boolean;
}

export default function App(props: AppProps) {
  return (
    <BrowserRouter>
      <div className="font">
        <header>
          <Header />
        </header>
        <Route exact={true} path="/" component={HomePageContainer} />
        <Route path={`/${ROUTE_PATHS.HOW_IT_WORKS}`} component={HowItWorksPage} />
        <PrivateRoute
          path={`/${ROUTE_PATHS.PLAY}`}
          component={GameContainer}
          isAuthenticated={props.isAuthenticated}
        />
        <Route path={`/${ROUTE_PATHS.ABOUT}`} component={AboutPage} />
      </div>
    </BrowserRouter>
  );
}
