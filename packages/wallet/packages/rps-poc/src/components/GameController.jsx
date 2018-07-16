import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import PlayPage from './PlayPage';
import WaitingStep from './WaitingStep';
import SelectPlayStep from './SelectPlayStep';
import { types as playerAStates } from '../game-engine/application-states/ApplicationStatesPlayerA';

export default class GameController extends PureComponent {
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
}

GameController.propTypes = {
  applicationState: PropTypes.object.isRequired,
  chooseAPlay: PropTypes.func.isRequired,
  chooseOpponent: PropTypes.func.isRequired,
};
