import React from 'react';

interface Props {
  transactionID: string;
  networkId: number;
  title: string;
}

export default class EtherscanLink extends React.PureComponent<Props> {
  buildEtherscanLink() {
    switch (this.props.networkId) {
      case 1:
        return `https://etherscan.io/tx/${this.props.transactionID}`;
      case 4:
        return `https://rinkeby.etherscan.io/tx/${this.props.transactionID}`;
      case 3:
        return `https://ropsten.etherscan.io/tx/${this.props.transactionID}`;
      case 42:
        return `https://kovan.etherscan.io/tx/${this.props.transactionID}`;
      default:
        // We'll pretend we're on the main network just to verify the link works as expected
        return `https://etherscan.io/tx/${this.props.transactionID}`;
    }
  }
  render() {
    return (
      <a target="_blank" href={this.buildEtherscanLink()}>
        {this.props.title}
      </a>
    );
  }
}
