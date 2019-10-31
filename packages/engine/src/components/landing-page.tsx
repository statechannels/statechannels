import React from "react";
import engineIcon from "../images/orange-fireball.svg";

export default class LandingPage extends React.PureComponent {
  render() {
    return (
      <div className="pt-5 container-fluid pagination-centered text-center">
        <h1>Welcome to the Magmo Engine!</h1>
        <img className="p-3" src={engineIcon} />
        <p>The Magmo engine cannot be directly accessed from here.</p>
        <p>Check out some of the applications that use the Magmo engine:</p>
        <p>
          <a href="https://rps.magmo.com">Rock Paper Scissors (by Magmo)</a>
        </p>
        <p>
          <a href="https://ttt.magmo.com">Tic Tac Toe (by Magmo)</a>
        </p>
      </div>
    );
  }
}
