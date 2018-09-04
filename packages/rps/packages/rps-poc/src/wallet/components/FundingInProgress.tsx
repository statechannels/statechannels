import React from 'react';

interface Props {
  message: string;
}

export default class FundingInProgress extends React.PureComponent<Props> {
  render() {
    return (
      <div>
        <h1>Funding underway!</h1>
        <p>
          Funding underway for channel 0x234234 for the application at https://rps-poc.com using the{' '}
          <strong>SimpleAdjudicator</strong> strategy.
        </p>
        <ul>
          <li>Agree strategy</li>
          <li>You deploy the adjudicator and deposit 0.123 ETH</li>
          <li>Wait for confirmation</li>
          <li>Send the adjudicator address to other participant</li>
          <li>Other participant deposits 0.123</li>
          <li>Wait for confirmation</li>
          <li>Funding successful!</li>
        </ul>
      </div>
    );
  }
}
