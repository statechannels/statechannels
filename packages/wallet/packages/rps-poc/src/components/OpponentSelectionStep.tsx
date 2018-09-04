import React from 'react';
import { StyleSheet, css } from 'aphrodite';

import { Opponent } from '../redux/reducers/opponents';

import Button from './Button';

interface Props {
  chooseOpponent: (opponentAddress: string, stake: number) => void;
  playComputer: (stake: number) => void;
  opponents: Opponent[];
  currentPlayer?: {
    address: string;
    name: string;
  };
}

export default class OpponentSelectionStep extends React.PureComponent<Props> {
  constructor(props) {
    super(props);
  }

  render() {
    const { opponents, chooseOpponent, playComputer } = this.props;

    return (
      <React.Fragment>
        <h1>Select an opponent:</h1>
        <div className={css(styles.centeredTable)}>
          <table className={css(styles.leftAlign)}>
            <tbody>
              <tr className={css(styles.titleRow)}>
                <th>Name</th>
                <th>Wager (Finney)</th>
                <th>Time initiated</th>
              </tr>
              {opponents.map(opponent => (
                <tr key={opponent.address}>
                  <td>{opponent.name}</td>
                  <td>{opponent.wager}</td>
                  <td>
                    <Button onClick={() => chooseOpponent(opponent.address, 50)}>Challenge</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={css(styles.buttonPosition)}>
            <Button onClick={() => playComputer(50)}>Play against computer</Button>
          </div>
          <div className={css(styles.buttonPosition)}>
            <div className={css(styles.topAlign)}>
              <Button onClick={this.createChallengeHandler}>Create challenge</Button>
            </div>
            <div className={css(styles.input, styles.topAlign)}>
              <input ref={this.wagerInput} />
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  centeredTable: {
    left: '50%',
    position: 'absolute',
    transform: 'translateX(-50%)',
  },

  leftAlign: {
    textAlign: 'left',
  },

  buttonPosition: {
    textAlign: 'center',
    padding: '20px',
  },

  input: {
    fontSize: 18,
    marginLeft: 8,
  },

  topAlign: {
    verticalAlign: 'middle',
    display: 'inline-block',
  },

  titleRow: {
    height: 60,
  },
});
