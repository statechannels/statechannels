import React from 'react';

import Button from './Button';

const opponents = [
  {
    name: 'Joe Bob',
    wager: '500',
    time: '12:39pm',
    id: 0,
  },
  {
    name: 'Sarah Beth',
    wager: '700',
    time: '1:28pm',
    id: 1,
  },
  {
    name: 'Mary Jane',
    wager: '50',
    time: '3:33pm',
    id: 2,
  },
  {
    name: 'James Fickel',
    wager: '5000',
    time: '4:01pm',
    id: 3,
  },
];

export default function HomePage() {
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
                  <Button href="/next">Challenge</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form>
          <h3>Or, create a challenge:</h3>
          Name:<input style={{ marginLeft: 12, marginRight: 12 }} type="text" name="name" />
          Wager:<input style={{ marginLeft: 12, marginRight: 12 }} type="text" name="wager" />
          <input className="button" type="submit" value="Submit" />
        </form>
      </div>
    </div>
  );
}
