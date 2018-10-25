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
          <li>Each player must have enough funds to cover the wager for each round.</li>
          <li>Each player takes turns picking a selection.</li>
          <li>At the end of each round a winner is determined.</li>
          <li>The winner of each round collects their wager + their opponents wager.</li>
          <li>The game ends when one player is out of wager funds or leaves the game.</li>
        </ul>
      </ModalBody>
    </Modal>
  );
};