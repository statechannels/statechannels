import { connect } from 'react-redux';

import ChallengePage from '../components/ChallengePage';
import * as lobbyActions from '../redux/lobby/actions';
import * as loginActions from '../redux/login/actions';

import { SiteState } from '../redux/reducer';
import { Challenge } from '../redux/application/reducer';

const mapStateToProps = (state: SiteState) => ({
  challenges: state.app.challenges as Challenge[],
});

const mapDispatchToProps = {
  acceptChallenge: lobbyActions.acceptChallenge,
  createChallenge: lobbyActions.createChallenge,
  logoutRequest: loginActions.logoutRequest,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ChallengePage);
