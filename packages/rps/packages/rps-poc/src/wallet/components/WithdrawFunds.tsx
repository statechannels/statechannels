import { PureComponent } from "react";
import { Button } from 'reactstrap';
import React from 'react';
import { StyleSheet, css } from 'aphrodite';
import web3Utils from 'web3-utils';
interface Props {
  selectAddress(address: string);
}
interface State {
  address: string;
  valid: boolean;
}
export default class WithdrawFunds extends PureComponent<Props, State>{
  constructor(props) {
    super(props);
    this.state = { address: web3.eth.defaultAccount, valid: true };
    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(event) {
    const valid = web3Utils.isAddress(event.target.value);
    this.setState({ address: event.target.value, valid });
  }

  render() {
    return (
      <div>
        Please select the address to deposit the funds to:
                <form>
          <input id="addressInput" type="text" className={css(styles.address)} value={this.state.address} onChange={this.handleChange} />
          <Button onClick={() => this.props.selectAddress(this.state.address)}>Withdraw Funds</Button>
          <div className={css(styles.error)}>{!this.state.valid ? 'Invalid address' : ''}</div>
        </form>
      </div>

    );
  }
}

const styles = StyleSheet.create({
  address: {
    width: '70%',
    marginRight: 5,
  },
  error: {
    color: '#cc0000',
  },
});
