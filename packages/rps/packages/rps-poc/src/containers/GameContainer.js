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


class GameContainer extends PureComponent {
  render() {
    let {
      applicationState,
      chooseAPlay,
      chooseOpponent,
    } = this.props;

    switch (applicationState && applicationState.type) {
      case "WaitForPreFundSetup1":
        return <WaitingStep message="opponent to accept game" />;

      case "WaitForBlockchainDeploy":
        return <WaitingStep message="confirmation of adjudicator deployment" />;

      case "WaitForBToDeposit":
        return <WaitingStep message="confirmation of opponent's deposit" />;

      case "WaitForPostFundSetup1":
        return <WaitingStep message="opponent to confirm deposits" />;

      case "ReadyToChooseAPlay":
        return <SelectPlayStep handleSelectPlay={chooseAPlay} />;

      case "WaitForAccept":
        return <WaitingStep message="opponent to choose their move" />;

      case "WaitForResting":
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

      


