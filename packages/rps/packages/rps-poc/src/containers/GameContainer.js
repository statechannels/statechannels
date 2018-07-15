import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import PlayPage from '../components/PlayPage';
import WaitingStep from '../components/WaitingStep';
import SelectPlayStep from '../components/SelectPlayStep';
import {
  chooseOpponent,
  chooseAPlay,
} from '../redux/actions';
import { types as playerAStates } from '../game-engine/application-states/ApplicationStatesPlayerA';


class GameContainer extends PureComponent {
  render() {
    const {
      applicationState,
      chooseAPlay,
      chooseOpponent,
    } = this.props;

    switch (applicationState && applicationState.type) {
      case playerAStates.WaitForPreFundSetup1:
        return <WaitingStep message="opponent to accept game" />;

      case playerAStates.WaitForBlockchainDeploy:
        return <WaitingStep message="confirmation of adjudicator deployment" />;

      case playerAStates.WaitForBToDeposit:
        return <WaitingStep message="confirmation of opponent's deposit" />;

      case playerAStates.WaitForPostFundSetup1:
        return <WaitingStep message="opponent to confirm deposits" />;

      case playerAStates.ReadyToChooseAPlay:
        return <SelectPlayStep handleSelectPlay={chooseAPlay} />;

      case playerAStates.WaitForAccept:
        return <WaitingStep message="opponent to choose their move" />;

      case playerAStates.WaitForResting:
        return <WaitingStep message="opponent to accept the outcome" />;

      default:
        return <PlayPage handleChooseOpponent={chooseOpponent} />;
    }
  }
};

GameContainer.propTypes = {
  applicationState: PropTypes.object,
};

const mapStateToProps = (state) => ({
  applicationState: state,
});

const mapDispatchToProps = {
  chooseOpponent,
  chooseAPlay,
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(GameContainer)

      


