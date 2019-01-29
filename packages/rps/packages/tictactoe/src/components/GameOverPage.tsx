import _ from "lodash";
import React from "react";
import NavigationBarContainer from "../containers/NavigationBarContainer";
import GameBarContainer from "../containers/GameBarContainer";
import MagmoLogoContainer from "../containers/MagmoLogoContainer";
import GameFooterContainer from "../containers/GameFooterContainer";
import { Button, Modal, ModalBody } from "reactstrap";

interface Props {
  conclude: () => void;
  visible: boolean;
  ourTurn: boolean;
}

export default class GameOverPage extends React.PureComponent<Props> {
  render() {
    const { ourTurn } = this.props;
    return (
      <div className="w-100">
        <NavigationBarContainer />
        <GameBarContainer />
        <Modal
          className="game-over-container"
          isOpen={this.props.visible}
          centered={true}
        >
          <ModalBody>
            <div className="game-over-content">
              <h1>The Game is over!</h1>
              {ourTurn && <div>You must close the channel and withdraw your funds to exit the game.</div>}
              {ourTurn && <Button className="game-over-button" onClick={this.props.conclude} block={true}>
              Close & Withdraw
          </Button>}
              {!ourTurn && <div>Waiting on the other player to close the channel so your funds can be withdrawn.</div>}
            </div>
          </ModalBody>
        </Modal>
        <MagmoLogoContainer />
        <GameFooterContainer />
      </div>
    );
  }
}
