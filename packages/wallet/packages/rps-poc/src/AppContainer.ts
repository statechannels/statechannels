import { ApplicationState } from './redux/reducers';
import App, { AppProps } from './App';
import { connect } from 'react-redux';

const mapStateToProps = (state: ApplicationState): AppProps => {
  return {
    isAuthenticated: state.login && state.login.loggedIn,
  };
};

export default connect(mapStateToProps)(App);
