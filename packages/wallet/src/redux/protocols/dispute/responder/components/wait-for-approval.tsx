import React, {Fragment} from "react";
import Button from "reactstrap/lib/Button";

interface Props {
  approve: () => void;
  expirationTime: number;
}
export default class WaitForApproval extends React.PureComponent<Props> {
  render() {
    const {approve} = this.props;
    const expiryDate = new Date(this.props.expirationTime)
      .toLocaleTimeString()
      .replace(/:\d\d /, " ");
    return (
      <Fragment>
        <h2>Challenge Detected</h2>
        <div>
          <p>You have been challenged! </p>
          <p> If you don't respond by {expiryDate}, the channel will be closed.</p>
          <Button color="primary" onClick={approve}>
            Respond
          </Button>
        </div>
      </Fragment>
    );
  }
}
