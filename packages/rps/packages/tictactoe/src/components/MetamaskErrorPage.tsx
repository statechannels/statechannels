import * as React from 'react';
import { MetamaskError } from '../redux/metamask/actions';
import { ApplicationLayout } from './ApplicationLayout';

interface MetamaskErrorProps {
  error: MetamaskError;
}

export default function MetamaskErrorPage(props: MetamaskErrorProps) {

  let message = (
    <span>
      This site needs to be connected to an ethereum wallet to function. If you have metamask,
      enable it now. If not, you can download a copy{' '}
      <a href="https://metamask.io/">
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
    <ApplicationLayout>
    <div className="waiting-room-container">
      <h1 className="w-100 text-center waiting-room-title">
      Metamask Error
      </h1>
      <div className="w-100">
      <p className="lead text-center waiting-room-title" >{message}</p>
      </div>
    </div>
  </ApplicationLayout>
  );
}
