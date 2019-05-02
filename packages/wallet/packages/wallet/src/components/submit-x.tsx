import React from 'react';

interface Props {
  name: string;
}

export default class SubmitX extends React.PureComponent<Props> {
  render() {
    const { name } = this.props;
    return (
      <div>
        <h1>Sending your {name}</h1>
        <p>Please confirm the transaction in MetaMask.</p>
      </div>
    );
  }
}
