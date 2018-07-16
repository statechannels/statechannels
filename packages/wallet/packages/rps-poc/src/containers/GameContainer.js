import { connect } from 'react-redux';

import { chooseOpponent, chooseAPlay } from '../redux/actions';
import GameController from '../components/GameController';

const mapStateToProps = state => ({
  applicationState: state,
});

const mapDispatchToProps = {
  chooseOpponent,
  chooseAPlay,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(GameController);
