import { SiteState } from '../../redux/reducer';
import { connect } from 'react-redux';
import ChallengeHeader from '../components/ChallengeHeader';

const mapStateToProps = (state: SiteState) => {
  return {
    expiryTime: state.wallet.challenge.expirationTime,
  };
};

export default connect(
  mapStateToProps,
)(ChallengeHeader);
