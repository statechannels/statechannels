import { connect } from 'react-redux';

import { SiteState } from '../redux/reducer';
import MagmoLogo from '../components/MagmoLogo';
import { PlayingState } from '../redux/game/state';

function mapStateToProps(state: SiteState) {
  const gameState = state.game.gameState as PlayingState;
  const turnNum = gameState.turnNum;
  return {
    turnNum,
  };
}
export default connect(mapStateToProps)(MagmoLogo);
