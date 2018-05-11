import React from 'react';

import Header from './components/Header';
import HomePage from './components/HomePage';
import './App.css';

class App extends React.Component {
  render() {
    return (
      <div>
        <header>
          <Header />
        </header>
        <HomePage />
      </div>
    );
  }
}

export default App;
