import { connect } from 'react-redux';

import WaitingRoomPage from '../components/WaitingRoomPage';
import * as waitingRoomActions from '../redux/waiting-room/actions';

import { SiteState } from '../redux/reducer';
import { Challenge } from '../redux/application/reducer';

const mapStateToProps = (state: SiteState) => ({
  myChallenge: state.app.myChallenge as Challenge,
});

const mapDispatchToProps = {
  cancelChallenge: waitingRoomActions.cancelChallenge,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(WaitingRoomPage);
