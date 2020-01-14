import React, {Fragment} from "react";
import {Button} from "reactstrap";
import {formatEther} from "ethers/utils";

interface Props {
  approve: (address: string) => void;
  deny: () => void;
  withdrawalAmount: string;
}
interface State {
  withdrawAddress: string;
}

export default class WaitForApproval extends React.PureComponent<Props, State> {
  interval: any;
  constructor(props) {
    super(props);
    const currentAddress = window.web3.eth.defaultAccount;
    this.state = {withdrawAddress: currentAddress};

    this.handleApprove = this.handleApprove.bind(this);
  }
  componentDidMount() {
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("accountsChanged", accounts => {
        this.setState({withdrawAddress: accounts[0]});
      });
    } else {
      this.interval = setInterval(() => {
        if (window.web3.eth.defaultAccount !== this.state.withdrawAddress) {
          this.setState({withdrawAddress: window.web3.eth.defaultAccount});
        }
      }, 100);
    }
  }

  componentWillUnmount() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
  handleApprove() {
    this.props.approve(this.state.withdrawAddress);
  }

  render() {
    const {deny, withdrawalAmount} = this.props;
    const formattedAmount = `${formatEther(withdrawalAmount)} ETH`;
    return (
      <Fragment>
        <h2>Withdrawal Requested</h2>
        <div>
          <p>Do you wish to withdraw {formattedAmount} from this channel?</p>
          <p>{formattedAmount} will be sent to your current metamask account:</p>
          <input
            disabled={true}
            style={{width: "95%"}}
            type="text"
            readOnly={true}
            defaultValue={this.state.withdrawAddress}
          />
        </div>
        <Button color="primary" onClick={this.handleApprove}>
          Approve
        </Button>
        <Button onClick={deny}>Deny</Button>
      </Fragment>
    );
  }
}
