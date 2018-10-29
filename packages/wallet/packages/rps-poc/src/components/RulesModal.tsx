import React from "react";
import { Modal, ModalBody, ModalHeader } from "reactstrap";

interface Props {
  visible: boolean;
  rulesRequest: () => void;
}

export const RulesModal = (props: Props) => {
  return (
    <Modal isOpen={props.visible} toggle={props.rulesRequest} centered={true}>
      <ModalHeader className="rules-header">
        Here are the rules:
      </ModalHeader>
      <ModalBody>
        <ul>
          <li>Each player must contribute their buy-in amount to enter a game.</li>
          <li>Each player must have enough funds to cover the buy-in for each round.</li>
          <li>Each player takes turns picking a selection.</li>
          <li>At the end of each round a winner is determined.</li>
          <li>The winner of each round collects their buy-in + their opponent's buy-in.</li>
          <li>The game ends when one player does not have enough funds for a round buy-in or leaves the game.</li>
        </ul>
      </ModalBody>
    </Modal>
  );
};