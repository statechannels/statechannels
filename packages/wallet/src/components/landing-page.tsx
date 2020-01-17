import React from "react";
import walletIcon from "../images/blue-logo.svg";

export default class LandingPage extends React.PureComponent {
  render() {
    return (
      <div className="pt-5 container-fluid pagination-centered text-center">
        <h1>Welcome to the State Channels Wallet!</h1>
        <img className="p-3" width="150" src={walletIcon} />
        <p>The State Channels wallet cannot be directly accessed from here.</p>
        <p>Check out some of the applications that use the State Channels wallet:</p>
        <p>
          <a href="https://rps.statechannels.org">Rock Paper Scissors</a>
        </p>
      </div>
    );
  }
}
