import { connect } from 'react-redux';

import HomePage from '../components/HomePage';
import { LoginAction } from '../redux/actions/login';

const mapStateToProps = (state) => ({
  loggedIn: state.login.loggedIn,
});

const mapDispatchToProps = {
  login: LoginAction.login,
  logout: LoginAction.logout,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(HomePage)
