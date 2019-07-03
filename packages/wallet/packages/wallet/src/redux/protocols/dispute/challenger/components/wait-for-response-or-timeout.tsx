import React, { Fragment } from 'react';

interface Props {
  expirationTime: number;
}

export default class WaitForResponseOrTimeout extends React.PureComponent<Props> {
  render() {
    const expiryDate = new Date(this.props.expirationTime)
      .toLocaleTimeString()
      .replace(/:\d\d /, ' ');
    return (
      <Fragment>
        <h2>Waiting for your opponent to respond!</h2>
        <p>
          If they don't respond by {expiryDate}, the channel will be closed and you can withdraw
          your funds.
        </p>
      </Fragment>
    );
  }
}
