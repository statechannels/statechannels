import React from 'react';
import { Button } from 'reactstrap';

interface Props {
  message: string;
  tryAgain: () => void;
}

export default class FundingError extends React.PureComponent<Props> {
  render() {
    return (
      <div>
        <div>{this.props.message}</div>
        <Button onClick={this.props.tryAgain}>Try Again</Button>
      </div>
    );
  }
}
