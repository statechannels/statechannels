import React from 'react';
import SidebarLayout from './sidebar-layout';

interface Props {
  name: string;
}

export default class SubmitX extends React.PureComponent<Props> {
  render() {
    const { name } = this.props;
    return (
      <SidebarLayout>
        <h1>Sending your {name}</h1>
        <p>Please confirm the transaction in MetaMask.</p>
      </SidebarLayout>
    );
  }
}
