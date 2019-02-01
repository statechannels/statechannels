import React from 'react';

import SidebarLayout from '../SidebarLayout';
import YesOrNo from '../YesOrNo';

interface Props {
  approveWithdrawal: (address: string) => void;
  declineWithdrawal: () => void;
}
interface State {
  withdrawAddress: string;
}
export default class SelectAddress extends React.PureComponent<Props, State> {
  interval: any;
  constructor(props) {
    super(props);
    const currentAddress = web3.eth.defaultAccount;
    this.state = { withdrawAddress: currentAddress };

    this.handleSubmitAddress = this.handleSubmitAddress.bind(this);


  }

  componentDidMount() {
    if (typeof ethereum !== 'undefined') {
      ethereum.on('accountsChanged', (accounts) => {
        this.setState({ withdrawAddress: accounts[0] });
      });
    } else {
      this.interval = setInterval(() => {
        if (web3.eth.defaultAccount !== this.state.withdrawAddress) {
          this.setState({ withdrawAddress: web3.eth.defaultAccount });
        }
      }, 100);
    }
  }

  componentWillUnmount() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
  render() {
    const { declineWithdrawal } = this.props;
    return (
      <SidebarLayout>
        <h1>Approve Withdrawal</h1>
        <p>
          Do you wish to withdraw your funds from this channel?
        </p>
        <p>
          The funds will be sent to your current metamask account:
        </p>
        <input disabled={true} style={{ width: '95%' }} type="text" readOnly={true} value={this.state.withdrawAddress} />
        <YesOrNo yesAction={this.handleSubmitAddress} noAction={declineWithdrawal} yesMessage="Withdraw" noMessage="Cancel" />

      </SidebarLayout>
    );
  }
  handleSubmitAddress() {
    this.props.approveWithdrawal(this.state.withdrawAddress);
  }

}

