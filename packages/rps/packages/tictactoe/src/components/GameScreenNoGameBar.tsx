import React from "react";
import NavigationBarContainer from "../containers/NavigationBarContainer";
import GameFooterContainer from "../containers/GameFooterContainer";

export const GameScreenNoGameBar = props => {
  return (
    <div className="w-100">
      <NavigationBarContainer />
      <div className="container centered-container w-100 game-container">
        {props.children}
      </div>
      <GameFooterContainer />
    </div>
  );
};
