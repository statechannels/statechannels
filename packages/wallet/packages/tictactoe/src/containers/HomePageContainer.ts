import { connect } from 'react-redux';

import HomePage from '../components/HomePage';
import * as loginActions from '../redux/login/actions';

const mapStateToProps = state => ({});

const mapDispatchToProps = {
  login: loginActions.loginRequest,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(HomePage);
