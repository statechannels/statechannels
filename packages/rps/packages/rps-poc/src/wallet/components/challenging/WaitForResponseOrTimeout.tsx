import React from 'react';
import SidebarLayout from '../SidebarLayout';

interface Props {
  expirationTime: number;
}

export default class WaitForResponseOrTimeout extends React.PureComponent<Props> {
  render() {
    const expiryDate = new Date(this.props.expirationTime * 1000).toLocaleTimeString();
    return (
      <SidebarLayout>
        <h1>Waiting for your opponent to respond!</h1>
        <p>
          If they don't respond by {expiryDate}, the channel will be closed and you can
          withdraw your funds.
        </p>
      </SidebarLayout>
    );
  }
}
