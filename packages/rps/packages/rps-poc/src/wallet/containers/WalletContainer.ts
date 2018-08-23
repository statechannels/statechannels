import { ApplicationState } from '../../redux/reducers';
import { connect } from 'react-redux';
import WalletController from '../components/WalletController';

const mapStateToProps = (state: ApplicationState) => {
	return {
	  walletState: state.wallet,
	}
}

export default connect(
  mapStateToProps,
)(WalletController);

