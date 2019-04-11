import React from 'react';
import StatusBarLayout from '../status-bar-layout';

export default class BWaitForPostFundSetup extends React.PureComponent<{}> {
  render() {
    return (
      <StatusBarLayout>
        <h1>Waiting for confirmation</h1>
        <p>Waiting for your opponent to confirm the deposit.</p>
      </StatusBarLayout>
    );
  }
}
