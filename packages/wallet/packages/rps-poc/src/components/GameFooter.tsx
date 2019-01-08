import React from "react";
import { Button } from 'reactstrap';
import MAGMO_LOGO from '../images/magmo_logo.svg';


interface Props {
  createBlockchainChallenge: () => void;
  resign: () => void;
  isNotOurTurn: boolean;
  canChallenge: boolean;
  challengeOngoing: boolean;
}

export default class GameFooter extends React.PureComponent<Props> {
  render() {
    const { resign, createBlockchainChallenge, isNotOurTurn, canChallenge, challengeOngoing } = this.props;

    return (
      <nav className="navbar fixed-bottom navbar-light footer-bar">
        {challengeOngoing ?
          <div className="w-100 text-center h1">Challenge Ongoing</div>
          :
          <div className="container">
            <Button className="footer-resign" outline={true} onClick={resign} disabled={isNotOurTurn}>
              {isNotOurTurn ? "Can't Resign" : "Resign"}
            </Button>
            <Button className="footer-challenge" outline={true} onClick={createBlockchainChallenge} disabled={!canChallenge}>
              {canChallenge ? "Challenge on-chain" : "Can't challenge"}
            </Button>
            <div className="ml-auto">
              <div className="footer-logo-container">
                <img src={MAGMO_LOGO} />
                <small className="text-muted">
                  Something not working? Email us at <a href="oops@magmo.com">oops@magmo.com</a>
                </small>
              </div>
            </div>
          </div>
        }
      </nav>
    );
  }
}
