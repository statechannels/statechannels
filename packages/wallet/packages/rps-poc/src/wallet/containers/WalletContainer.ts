import { SiteState } from '../../redux/reducer';
import { connect } from 'react-redux';
import WalletController from '../components/WalletController';
import * as playerActions from '../redux/actions/player';
import * as challengeActions from '../redux/actions/challenge';

const mapStateToProps = (state: SiteState) => {
  return {
    walletState: state.wallet.walletState,
    challengeState: state.wallet.challenge,
    showWallet: state.wallet.display.showWallet,
  };
};

const mapDispatchToProps = {
  tryFundingAgain: playerActions.tryFundingAgain,
  approveFunding: playerActions.approveFunding,
  declineFunding: playerActions.declineFunding,
  selectWithdrawalAddress: playerActions.selectWithdrawalAddress,
  respondWithMove: challengeActions.respondWithMove,
  respondWithAlternativeMove: challengeActions.respondWithAlternativeMove,
  refute: challengeActions.refute,
  conclude: challengeActions.conclude,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(WalletController);
