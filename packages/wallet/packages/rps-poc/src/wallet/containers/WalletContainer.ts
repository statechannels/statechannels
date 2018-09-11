import { SiteState } from '../../redux/reducer';
import { connect } from 'react-redux';
import WalletController from '../components/WalletController';
import * as playerActions from '../redux/actions/player';

const mapStateToProps = (state: SiteState) => {
	return {
	  walletState: state.wallet,
	}
}

const mapDispatchToProps = {
	tryAgain: playerActions.tryFundingAgain,
}
export default connect(
	mapStateToProps,
	mapDispatchToProps,
)(WalletController);

