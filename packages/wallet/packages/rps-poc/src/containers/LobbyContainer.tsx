import { connect } from 'react-redux';

import ChallengePage from '../components/ChallengePage';
import * as lobbyActions from '../redux/lobby/actions';

import { SiteState } from '../redux/reducer';
import { Challenge } from '../redux/application/reducer';

const mapStateToProps = (state: SiteState) => ({
  challenges: state.app.challenges as Challenge[],
  autoOpponentAddress: state.autoOpponentAddress,
});

const mapDispatchToProps = {
  acceptChallenge: lobbyActions.acceptChallenge,
  createChallenge: lobbyActions.createChallenge,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ChallengePage);
