import React from 'react';

import { PLAY_OPTIONS } from '../constants';

export default class SelecPlayStep extends React.PureComponent {
  render() {
    const { handleSelectPlay, afterOpponent } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>
            {afterOpponent
              ? 'Your opponent has chosen a move, now choose yours:'
              : 'Choose your move:'}
          </h1>
        </div>
        <div style={{ width: '100%' }}>
          {PLAY_OPTIONS.map(option => (
            <a
              onClick={() => handleSelectPlay(option.id)}
              style={{ display: 'inline-block', width: '33%' }}
              key={option.id}
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
