import React from 'react';

import { Button } from 'reactstrap';
import SidebarLayout from '../SidebarLayout';

interface Props {
  approveAction: (address: string) => void;
  approveButtonTitle: string;
  title: string;
  description: string;
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
    const { approveButtonTitle, title, description } = this.props;
    return (
      <SidebarLayout>
        <h2 className="bp-2">{title}</h2>
        <p>
          {description}
        </p>
        <p>
          The funds will be sent to your current metamask account:
        </p>
        <div className="pb-2">
          <input disabled={true} style={{ width: '95%' }} type="text" readOnly={true} defaultValue={this.state.withdrawAddress} />
        </div>
        <div className="pb-2">
          <Button onClick={this.handleSubmitAddress} >{approveButtonTitle}
          </Button>
        </div>
      </SidebarLayout>
    );
  }
  handleSubmitAddress() {
    this.props.approveAction(this.state.withdrawAddress);
  }
}


