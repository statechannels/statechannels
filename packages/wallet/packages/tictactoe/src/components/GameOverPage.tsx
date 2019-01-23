import _ from "lodash";
import React from "react";
import NavigationBarContainer from "../containers/NavigationBarContainer";
import GameBarContainer from "../containers/GameBarContainer";
import MagmoLogoContainer from "../containers/MagmoLogoContainer";
import GameFooterContainer from "../containers/GameFooterContainer";
import { Button, Modal, ModalBody } from "reactstrap";

interface Props {
  withdraw: () => void;
  visible: boolean;
}

export default class GameOverPage extends React.PureComponent<Props> {
  render() {
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
              <div>You must withdraw your funds to exit the game.</div>
              <Button
                className="game-over-button"
                onClick={this.props.withdraw}
                block={true}
              >
                Withdraw Funds Now
              </Button>
            </div>
          </ModalBody>
        </Modal>
        <MagmoLogoContainer />
        <GameFooterContainer />
      </div>
    );
  }
}
