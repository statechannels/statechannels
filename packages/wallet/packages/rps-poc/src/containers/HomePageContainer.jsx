import React from 'react';
import { connect } from 'react-redux';

import HomePage from '../components/HomePage'
import { loginUser } from '../redux/actions';

const mapDispatchToProps = {
  loginUser,
}

export default connect(
  null,
  mapDispatchToProps,
)(HomePage)
