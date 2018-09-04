import React from 'react';

interface Props {
  message: string;
}

export default class FundingConfirmedPage extends React.PureComponent<Props> {
  render() {
    const { message } = this.props;

    return (
      <React.Fragment>
        <h1>Funding confirmed</h1>
        <div>{message}</div>
      </React.Fragment>
    );
  }
}
