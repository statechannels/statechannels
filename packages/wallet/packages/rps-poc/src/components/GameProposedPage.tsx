import React from 'react';

import FooterBar from './FooterBar';

interface Props {
  message: string;
}

export default class ProposeGamePage extends React.PureComponent<Props> {
  render() {
    const { message } = this.props;

    return (
      <div>
        <h1>Game Proposed</h1>

        <div>Waiting for your opponent to accept the game!</div>

        <FooterBar>{message}</FooterBar>
      </div>
    );
  }
}
