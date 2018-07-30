import { connect } from 'react-redux';

import { chooseOpponent, chooseAPlay, messageSent } from '../redux/actions/game';
import { subscribeOpponents } from '../redux/actions/opponents';
import GameController from '../components/GameController';

const mapStateToProps = state => ({
  applicationState: state.game,
  opponents: state.opponents,
});

const mapDispatchToProps = {
  chooseAPlay,
  messageSent,
  chooseOpponent,
  subscribeOpponents,
};

export default connect(
  mapDispatchToProps,
  mapStateToProps,
)(GameController);
