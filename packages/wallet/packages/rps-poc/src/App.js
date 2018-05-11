import React from 'react';

import Header from './components/Header';
import HomePage from './components/HomePage';
// import HowItWorksPage from './components/HowItWorksPage';
import './App.css';

// TODO(ah): Add react-router

class App extends React.Component {
  render() {
    return (
      <div className="font">
        <header>
          <Header />
        </header>
        <HomePage />
      </div>
    );
  }
}

export default App;
