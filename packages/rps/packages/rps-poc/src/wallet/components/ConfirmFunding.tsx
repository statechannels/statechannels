import React from 'react';
import BN from 'bn.js';
import web3Utils from 'web3-utils';
import Button from '../../components/Button';
import { StyleSheet, css } from 'aphrodite';

export interface ConfirmFundingProps {
  myBalance: BN;
  opponentBalance: BN;
  rulesAddress: string;
  myAddress: string;
  opponentAddress: string;
  appName: string;
}
export interface ConfirmFundingDispatchProps {
  approve: () => void;
  decline: () => void;
}

export default class ConfirmFunding extends React.Component<
  ConfirmFundingProps & ConfirmFundingDispatchProps
> {
  render() {
    const {
      rulesAddress,
      myAddress,
      opponentAddress,
      appName,
      opponentBalance,
      myBalance,
      approve,
      decline,
    } = this.props;
    return (
      <div>
        <p>
          The website at {appName} would like you to open a channel with {opponentAddress} to play a
          game of rock paper scissors according to the rules at {rulesAddress}.
        </p>
        <p>The initial deposits will be:</p>
        <div>
          <div>
            You ({myAddress}
            ): {web3Utils.fromWei(myBalance, 'finney')} finney
          </div>
          <div>
            Opponent ({opponentAddress}
            ): {web3Utils.fromWei(opponentBalance, 'finney')} finney
          </div>
        </div>
        <p>Do you wish to open this channel?</p>
        <div className={css(styles.buttonContainer)}>
          <span className={css(styles.button)}>
            <Button onClick={decline}>No</Button>
          </span>
          <span className={css(styles.button)}>
            <Button onClick={approve}>Yes</Button>
          </span>
        </div>
      </div>
    );
  }
}
const styles = StyleSheet.create({
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '5px',
  },
  button: {
    margin: '15px',
  },
});
