import * as React from 'react';
import { StyleSheet, css } from 'aphrodite';
import { MetamaskError } from '../redux/metamask/actions';

interface MetamaskErrorProps {
  error: MetamaskError;
}

export default function MetamaskErrorPage(props: MetamaskErrorProps) {
  const networksTypes = {
    1: 'mainnet',
    2: 'morden',
    3: 'ropsten',
    42: 'kovan',
    4: 'rinkeby',
  };
  let message = <span>This site needs to be connected to an ethereum wallet to function. If you have metamask, enable it now. If not, you can download a copy <a className={css(styles.link)} href="https://metamask.io/">here</a>.</span>;
  if (props.error.errorType === 'WrongNetwork' && props.error.networkId) {
    const type = networksTypes[props.error.networkId] || 'development';
    message = <span>{`The wrong network is selected in your ethereum wallet. Please select the ${type} network in your ethereum wallet.`}</span>;
  }

  return (
    <div className={css(styles.container)}>
      <div className={css(styles.headerText)}>
        <h1 className={css(styles.title)}>Ethereum Wallet Error</h1>
        <p>
          {message}
        </p>
      </div>
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '90%',
    margin: 'auto',
  },
  headerText: {
    textAlign: 'center',
    paddingBottom: 32,
  },
  link: {
    color: "unset",
  },
  title: {
    marginBottom: 0,
  },
});
