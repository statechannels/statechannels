import { SiteState } from '../../redux/reducer';
import { connect } from 'react-redux';
import WalletController from '../components/WalletController';

const mapStateToProps = (state: SiteState) => {
	return {
	  walletState: state.wallet,
	}
}

export default connect(
  mapStateToProps,
)(WalletController);

