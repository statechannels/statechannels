import { connect } from 'react-redux';

import { GameAction } from '../redux/actions/game';
import { OpponentAction } from '../redux/actions/opponents';
import GameController from '../components/GameController';
import { ApplicationState } from '../redux/reducers';

const mapStateToProps = (state: ApplicationState) => ({
  applicationState: state.game,
  opponents: state.opponents,
});

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

