import React from 'react';
import NavigationBarContainer from "../containers/NavigationBarContainer";
import GameBarContainer from "../containers/GameBarContainer";
import GameFooterContainer from "../containers/GameFooterContainer";

export const GameLayout = (props) => {
  return (
    <div className="w-100">
      <NavigationBarContainer />
      <GameBarContainer />

      <div className="container centered-container w-100">
        {props.children}
      </div>

      <GameFooterContainer />
    </div>
  );
};
