import React from 'react';
import { StyleSheet, css } from 'aphrodite';

import Button from './Button';

interface IProps {
  handleReturnToOpponentSelection: () => any;
  winnings: string;
}

export default class ConcludeStep extends React.PureComponent<IProps> {
  render() {
    const { handleReturnToOpponentSelection, winnings } = this.props;

    return (
      <React.Fragment>
        <h1>The game has concluded.</h1>
        <h3 className={css(styles.subtitle)}>{`You've won ${winnings} Finney!`}</h3>
        <Button onClick={handleReturnToOpponentSelection}>Return to opponent selection</Button>
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  subtitle: {
    width: '100%',
    paddingBottom: 16,
  },
});
