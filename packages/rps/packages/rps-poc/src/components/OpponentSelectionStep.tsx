import React from 'react';

import { Opponent } from '../redux/reducers/opponents';

import Button from './Button';

interface Props {
  chooseOpponent: (opponentAddress: string, stake: number) => void;
  playComputer: (stake: number) => void;
  opponents: Opponent[];
}

export default class OpponentSelectionStep extends React.PureComponent<Props> {
  render() {
    const { opponents, chooseOpponent, playComputer } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>Select an opponent:</h1>
        </div>
        <div
          style={{
            left: '50%',
            position: 'absolute',
            transform: 'translateX(-50%)',
          }}
        >
          <table style={{ textAlign: 'left' }}>
            <tbody>
              <tr style={{ height: 60 }}>
                <th>Name</th>
                <th>Wager (Finney)</th>
                <th>Time initiated</th>
              </tr>
              {opponents.map(opponent => (
                <tr key={opponent.address}>
                  <td>{opponent.name}</td>
                  <td>{opponent.address}</td>
                  <td>
                    <Button onClick={() => chooseOpponent(opponent.address, 50)} >
                      Challenge
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{textAlign:"center",padding:"20px"}}>
          <Button onClick={() => playComputer(50)}>Play against computer</Button>
          </div>
        </div>
      </div>
    );
  }
}
