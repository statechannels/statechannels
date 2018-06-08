import React from 'react';

import { MOVE_OPTIONS } from '../constants';

export default class SelectMoveStep extends React.PureComponent {
  render() {
    const { handleSelectMove } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>Choose your move:</h1>
        </div>
        <div style={{ width: '100%' }}>
          {MOVE_OPTIONS.map(option => (
            <a
              onClick={() => handleSelectMove(option.id)}
              style={{ display: 'inline-block', width: '33%' }}
            >
              <div style={{ height: 250, background: 'maroon', margin: 4 }}>
                <div
                  style={{
                    width: 'fit-content',
                    position: 'relative',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <h1>{option.name}</h1>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }
}
