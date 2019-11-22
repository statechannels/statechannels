import * as React from 'react';
import { MetamaskError } from '../redux/metamask/actions';

interface MetamaskErrorProps {
  error: MetamaskError;
}

export default function MetamaskErrorPage(props: MetamaskErrorProps) {
  let message = (
    <span>
      This site needs to be connected to an ethereum wallet to function. If you have metamask,
      enable it now. If not, you can download a copy <a href="https://metamask.io/">here</a>.
    </span>
  );
  if (props.error.errorType === 'WrongNetwork' && props.error.networkName) {
    message = (
      <span>{`The wrong network is selected in metamask. Please select the ${props.error.networkName} network in metamask.`}</span>
    );
  }
  if (props.error.errorType === 'MetamaskLocked') {
    message = <span>Your metamask account is currently locked. Please unlock it to continue.</span>;
  }
  if (props.error.errorType === 'UnknownError') {
    message = (
      <span>
        Something went wrong while attempting to connect to metamask. Please ensure metamask is
        installed and working correctly.
      </span>
    );
  }
  return (
    <div className="container centered-container w-100 mb-5">
      <div className="w-100 text-center mb-5">
        <h1 className="text-center waiting-room-title">Metamask Error</h1>
        <div>
          <p>{message}</p>
        </div>
      </div>
    </div>
  );
}
