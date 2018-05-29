import React from 'react';

import Button from './Button';

export default class OpponentSelectionStep extends React.PureComponent {
  render() {
    const { opponents, handleCreateChallenge, handleSelectChallenge } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>Select an opponent:</h1>
        </div>
        <div
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            position: 'absolute',
          }}
        >
          <table style={{ textAlign: 'left' }}>
            <tbody>
              <tr style={{ height: 60 }}>
                <th>Name</th>
                <th>Wager (Finney)</th>
                <th>Time initiated</th>
                <th />
              </tr>
              {opponents.map(opponent => (
                <tr key={opponent.id}>
                  <td>{opponent.name}</td>
                  <td>{opponent.wager}</td>
                  <td>{opponent.time}</td>
                  <td>
                    <Button onClick={handleSelectChallenge}>Challenge</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form>
            <h3>Or, create a challenge:</h3>
            <div style={{ marginTop: 12, fontSize: 24 }}>
              Name:<input style={{ marginLeft: 12, fontSize: 24 }} type="text" name="name" />
            </div>
            <div style={{ marginTop: 12, fontSize: 24 }}>
              Wager (in Finney):<input
                style={{ marginLeft: 12, fontSize: 24 }}
                type="text"
                name="wager"
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <Button onClick={handleCreateChallenge}>Submit</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}
