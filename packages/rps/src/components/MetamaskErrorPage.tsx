import * as React from 'react';
import {MetamaskError, MetamaskErrorType} from '../redux/metamask/actions';

interface MetamaskErrorProps {
  error: MetamaskError;
}

export default function MetamaskErrorPage(props: MetamaskErrorProps) {
  const defaultMessage = (
    <span>
      Something went wrong while attempting to connect to metamask. Please ensure metamask is
      installed and working correctly.
    </span>
  );
  let message;
  if (props.error.errorType === MetamaskErrorType.NoMetaMask) {
    message = (
      <span>
        This site needs to be connected to an ethereum wallet to function. If you have metamask,
        enable it now. If not, you can download a copy <a href="https://metamask.io/">here</a>.
      </span>
    );
  }
  if (props.error.errorType === MetamaskErrorType.WrongNetwork && props.error.networkName) {
    message = (
      <span>{`The wrong network is selected in metamask. Please select the ${props.error.networkName} network in metamask.`}</span>
    );
  }
  if (props.error.errorType === MetamaskErrorType.MetamaskLocked) {
    message = <span>Your metamask account is currently locked. Please unlock it to continue.</span>;
  }
  if (props.error.errorType === MetamaskErrorType.UnknownError) {
    message = defaultMessage;
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
