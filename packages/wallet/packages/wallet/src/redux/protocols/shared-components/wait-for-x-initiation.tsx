import React from 'react';

interface Props {
  name: string;
}

export default class WaitForXInitiation extends React.PureComponent<Props> {
  render() {
    const { name } = this.props;

    return (
      <div>
        <h2>Preparing your {name}</h2>
        <p>
          Your {name} will be sent to MetaMask very soon...
          {/* So soon, in fact,
          that if you have time to read this, there's a good chance something
          has gone wrong 😕. */}
        </p>
      </div>
    );
  }
}
