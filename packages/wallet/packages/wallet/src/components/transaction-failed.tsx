import React from 'react';
import SidebarLayout from './sidebar-layout';
import { Button } from 'reactstrap';
import magmoFireBall from '../images/white-fireball.svg';

interface Props {
  name: string;
  retryAction: () => void;
}

export default class TransactionFailed extends React.PureComponent<Props> {
  render() {
    const { name, retryAction } = this.props;
    return (
      <SidebarLayout>
        <h1>Transaction Failed</h1>
        <p>The {name} transaction was not submitted to the network. Hit retry to try again.</p>

        <Button onClick={retryAction}>
          <img src={magmoFireBall} />
          &nbsp;&nbsp;Retry
        </Button>
      </SidebarLayout>
    );
  }
}
