import { connect } from 'react-redux';

import ErrorPage from '../components/ErrorPage';
import { SiteState } from '../redux/reducer';

const mapStateToProps = (state: SiteState) => {
  return { error: state.app.error };
};

const mapDispatchToProps = {
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ErrorPage);
