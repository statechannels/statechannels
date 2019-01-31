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
        <div className="waiting-room-container">
          <h2 className="w-100 text-center waiting-room-title">Game Proposed!</h2>
          <p className="lead waiting-room-title">{message}</p>
        </div>
      </ApplicationLayout>
    );
  }
}
