import React from 'react';
import SidebarLayout from './SidebarLayout';

interface Props {
  name: string;
}

export default class WaitForOtherPlayer extends React.PureComponent<Props> {
  render() {
    const { name } = this.props;

    return (
      <SidebarLayout>
        <h1>Waiting for the other player to complete their {name}!</h1>
        <p>
          We're waiting on the other player to complete their {name}. Hang tight and we'll let you know when they're done!
        </p>
      </SidebarLayout>
    );
  }
}
