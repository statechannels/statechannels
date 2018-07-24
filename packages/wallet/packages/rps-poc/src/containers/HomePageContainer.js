import { connect } from 'react-redux';

import HomePage from '../components/HomePage';
import { login } from '../redux/actions/login';

const mapStateToProps = () => ({
});

const mapDispatchToProps = {
  login,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(HomePage)
