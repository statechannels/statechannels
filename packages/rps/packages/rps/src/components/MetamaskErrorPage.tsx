import * as React from 'react';
import { StyleSheet, css } from 'aphrodite';
import { MetamaskError } from '../redux/metamask/actions';

interface MetamaskErrorProps {
  error: MetamaskError;
}

export default function MetamaskErrorPage(props: MetamaskErrorProps) {

  let message = (
    <span>
      This site needs to be connected to an ethereum wallet to function. If you have metamask,
      enable it now. If not, you can download a copy{' '}
      <a className={css(styles.link)} href="https://metamask.io/">
        here
      </a>
      .
    </span>
  );
  if (props.error.errorType === 'WrongNetwork' && props.error.networkName) {
    message = (
      <span
      >{`The wrong network is selected in metamask. Please select the ${props.error.networkName} network in metamask.`}</span>
    );
  }
  if (props.error.errorType === "MetamaskLocked") {
    message = (
      <span>Your metamask account is currently locked. Please unlock it to continue.</span>
    );
  }
  if (props.error.errorType === "UnknownError") {
    message = (
      <span>Something went wrong while attempting to connect to metamask. Please ensure metamask is installed and working correctly.</span>
    );
  }
  return (
    <div className={css(styles.container)}>
      <div className={css(styles.headerText)}>
        <h1 className={css(styles.title)}>Metamask Error</h1>
        <p>{message}</p>
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
    color: 'unset',
  },
  title: {
    marginBottom: 0,
  },
});
