import React from "react";
import GameFooterContainer from "../containers/GameFooterContainer";

export const GameScreenNoGameBar = props => {
  return (
    <div className="w-100">
      <div className="container centered-container w-100 game-container">
        {props.children}
      </div>
      <GameFooterContainer />
    </div>
  );
};
