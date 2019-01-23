import React from "react";
import MAGMO_LOGO from "../images/magmo_logo.svg";

interface Props {
  turnNum: number;
}

export default class MagmoLogo extends React.PureComponent<Props> {
  render() {
    return (
      <div className="footer-logo-container">
        <span className="text-white turn-num">Turn: {this.props.turnNum}</span>
        <img src={MAGMO_LOGO} className="magmo-logo" /> <br />
        <small className="text-white">
          Something not working? Email us at{" "}
          <a href="mailto:oops@magmo.com">oops@magmo.com</a>
        </small>
      </div>
    );
  }
}
