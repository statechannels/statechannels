import React from 'react';
import {Button} from 'reactstrap';
import PROJECT_LOGO from '../images/horizontal_logo.svg';

interface Props {
  createBlockchainChallenge: (iChallenged: boolean) => void;
  resign: (iResigned: boolean) => void;
  canChallenge: boolean;
  challengeOngoing: boolean;
}

export default class GameFooter extends React.PureComponent<Props> {
  render() {
    const {resign, createBlockchainChallenge, canChallenge, challengeOngoing} = this.props;

    return (
      <nav className="navbar fixed-bottom navbar-light footer-bar">
        {challengeOngoing ? (
          <div className="w-100 text-center h1">Challenge Ongoing</div>
        ) : (
          <div className="container">
            <Button
              className="footer-resign"
              outline={true}
              onClick={() => resign(true)}
              disabled={false}
            >
              Resign
            </Button>
            <Button
              className="footer-challenge"
              outline={true}
              onClick={() => createBlockchainChallenge(true)}
              disabled={!canChallenge}
            >
              {canChallenge ? 'Challenge on-chain' : "Can't challenge"}
            </Button>
            <div className="ml-auto">
              <div className="footer-logo-container">
                <img width="150" src={PROJECT_LOGO} />
                <small className="text-muted">
                  Something not working? Email us at{' '}
                  <a href="mailto:oops@statechannels.org">oops@statechannels.org</a>
                </small>
              </div>
            </div>
          </div>
        )}
      </nav>
    );
  }
}
