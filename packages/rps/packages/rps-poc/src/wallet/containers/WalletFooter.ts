import { SiteState } from '../../redux/reducer';
import { connect } from 'react-redux';
import ChallengeFooter from '../components/ChallengeFooter';

const mapStateToProps = (state: SiteState) => {
  return {
    expiryTime: state.wallet.challenge.expirationTime,
  };
};

export default connect(
  mapStateToProps,
)(ChallengeFooter);
