import React from 'react';
import { ApplicationLayout } from './ApplicationLayout';

interface Props {
  message: string;
}

export default class ProposeGamePage extends React.PureComponent<Props> {
  render() {
    const { message } = this.props;

    return (
      <ApplicationLayout>
        <div className="w-100 text-center mb-5">
          <h1 className="mb-5">Game Proposed!</h1>
          <p className="lead">{message}</p>
        </div>
      </ApplicationLayout>
    );
  }
}
