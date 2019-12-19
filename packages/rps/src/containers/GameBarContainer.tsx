import {connect} from 'react-redux';

import GameBar from '../components/GameBar';
import {SiteState} from '../redux/reducer';
import {isPlayerA, isPlayerB} from '../redux/game/state';

function mapStateToProps(state: SiteState) {
  const {localState, channelState} = state.game;
  const aBal = channelState ? channelState.aBal : '';
  const bBal = channelState ? channelState.bBal : '';

  if (isPlayerA(localState)) {
    return {
      myName: localState.name,
      opponentName: localState.opponentName,
      myBalance: aBal,
      opponentBalance: bBal,
      roundBuyIn: localState.roundBuyIn,
    };
  } else if (isPlayerB(localState)) {
    return {
      myName: localState.name,
      opponentName: localState.opponentName,
      myBalance: bBal,
      opponentBalance: aBal,
      roundBuyIn: localState.roundBuyIn,
    };
  } else {
    return {
      myName: '',
      opponentName: undefined,
      myBalance: '0',
      opponentBalance: '0',
      roundBuyIn: '1',
    };
  }
}

const mapDispatchToProps = {};

export default connect(mapStateToProps, mapDispatchToProps)(GameBar);
