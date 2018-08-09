import { connect } from 'react-redux';

import { GameAction } from '../redux/actions/game';
import { OpponentAction } from '../redux/actions/opponents';
import GameController from '../components/GameController';

const mapStateToProps = state => ({
  applicationState: state.game,
  opponents: state.opponents,
});

const mapDispatchToProps = {
  chooseAPlay: GameAction.chooseAPlay,
  messageSent: GameAction.messageSent,
  chooseOpponent: GameAction.chooseOpponent,
  subscribeOpponents: OpponentAction.subscribeOpponents,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(GameController);
