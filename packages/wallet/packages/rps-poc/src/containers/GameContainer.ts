import _ from 'lodash';
import { connect } from 'react-redux';

import { GameAction } from '../redux/actions/game';
import { OpponentAction } from '../redux/actions/opponents';
import GameController from '../components/GameController';
import { ApplicationState } from '../redux/reducers';

const mapStateToProps = (state: ApplicationState) => {
	return {
	  applicationState: state.game,
	  opponents: getOpponents(),
	}

	function getOpponents() {
		const currentUserAddress = _.get(state, 'login.wallet.account.address');
		return _.filter(state.opponents, o => o.address !== currentUserAddress);
	}
}

const mapDispatchToProps = {
  choosePlay: GameAction.choosePlay,
  chooseOpponent: GameAction.chooseOpponent,
  subscribeOpponents: OpponentAction.subscribeOpponents,
  playComputer: GameAction.playComputer,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(GameController);

