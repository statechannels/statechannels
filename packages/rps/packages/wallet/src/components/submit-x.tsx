import React from 'react';
import StatusBarLayout from './status-bar-layout';

interface Props {
  name: string;
}

export default class SubmitX extends React.PureComponent<Props> {
  render() {
    const { name } = this.props;
    return (
      <StatusBarLayout>
        <h1>Sending your {name}</h1>
        <p>Please confirm the transaction in MetaMask.</p>
      </StatusBarLayout>
    );
  }
}
