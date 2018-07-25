import { connect } from 'react-redux';

import HomePage from '../components/HomePage';
import { login, logout } from '../redux/actions/login';

const mapStateToProps = (state) => ({
  loggedIn: state.login.loggedIn,
});

const mapDispatchToProps = {
  login,
  logout,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(HomePage)
