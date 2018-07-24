import { connect } from 'react-redux';

import { chooseOpponent, chooseAPlay } from '../redux/actions/game';
import { subscribeOpponents } from '../redux/actions/opponents';
import GameController from '../components/GameController';

const mapStateToProps = state => ({
  applicationState: state.game,
  opponents: state.opponents,
});

const mapDispatchToProps = {
  chooseOpponent,
  chooseAPlay,
  subscribeOpponents,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(GameController);
