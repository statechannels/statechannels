import { SiteState } from '../../redux/reducer';
import { connect } from 'react-redux';
import WalletController from '../components/WalletController';
import * as playerActions from '../redux/actions/player';

const mapStateToProps = (state: SiteState) => {
  return {
    walletState: state.wallet,
  };
};

const mapDispatchToProps = {
  tryFundingAgain: playerActions.tryFundingAgain,
  approveFunding: playerActions.approveFunding,
  declineFunding: playerActions.declineFunding,
  selectWithdrawalAddress: playerActions.selectWithdrawalAddress,
};
export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(WalletController);
