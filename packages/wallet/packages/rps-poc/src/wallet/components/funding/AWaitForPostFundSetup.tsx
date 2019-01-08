import React from 'react';
import SidebarLayout from '../SidebarLayout';

export default class AWaitForPostFundSetup extends React.PureComponent<{}> {
  render() {
    return (
      <SidebarLayout>
        <h1>Waiting for confirmation</h1>
        <p>
          Waiting for your opponent to confirm the deposit.
        </p>
      </SidebarLayout>
    );
  }
}
