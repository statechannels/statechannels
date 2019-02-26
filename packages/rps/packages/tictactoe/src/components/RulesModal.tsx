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
        Rules
      </ModalHeader>
      <ModalBody className="rules-body">
      Gameplay:
        <ul>
          <li><span className="xs">×</span> always plays first.</li>
          <li>Players takes turns making a single mark in an unmarked cell.</li>
          <li>Three marks of a kind in a row, column or diagonal is always a win.</li>
          <li>A loser is granted the right to play as <span className="xs">×</span> in the next round.</li>
          <li>A full board is a draw: players then exchange roles (○ ↔ <span className="xs">×</span>).</li>
          </ul>
        Funds:
        <ul>
          <li>Each player must have enough funds to cover the buy-in for each round.</li>
          <li>The winner of each round collects both buy-ins.</li>
          <li>The game ends when one player has no funds left or leaves the game.</li>
        </ul>
        Challenges:
        <ul>
          <li><b>Inactivity for long periods may result in the loss of your Round Buy In!</b></li>
          <li>If your opponent is unresponsive, launch an on-chain challenge to exit the channel and retrieve your funds. You will win the current round by default if they do not respond</li>
          <li>If challenged, you may respond with a new or existing move to avoid the timeout and forfeiting the round.</li>
          </ul>
      </ModalBody>
    </Modal>
  );
};