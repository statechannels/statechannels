import React from 'react';

interface Props {
  message: string;
}

export default class RequestToFund extends React.PureComponent<Props> {
  static defaultProps = {};

  render() {
    return (
      <div>
        <h1>Request to open channel</h1>
        <div>
          The application at https://rps-poc.com is trying to open a channel with 0x123abc23432def.
          Initial balances:
          <table>
            <tr>
              <td>0x123123123123 (you)</td>
              <td>0.123213123 ETH</td>
            </tr>
            <tr>
              <td>0x123abc23432def (them)</td>
              <td>0.123 ETH</td>
            </tr>
          </table>
          <button>Cancel</button>
          <button>Approve</button>
        </div>
      </div>
    );
  }
}
