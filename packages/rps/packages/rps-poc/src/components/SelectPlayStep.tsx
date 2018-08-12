import React from 'react';

import { Play } from '../game-engine/positions';

interface Props {
  chooseAPlay: (aPlay: Play) => void;
  afterOpponent?: any;
}

export default class SelectPlayStep extends React.PureComponent<Props> {
  render() {
    const { chooseAPlay, afterOpponent } = this.props;

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
          {Object.keys(Play).filter(key => !isNaN(Number(key))).map(option => (
            <button
              type="button"
              onClick={() => chooseAPlay(Play[option])}
              style={{ display: 'inline-block', width: '33%' }}
              key={option}
            >
              <div style={{ height: 250, background: 'maroon', margin: 4 }}>
                <div
                  style={{
                    left: '50%',
                    position: 'relative',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'fit-content',
                  }}
                >
                  <h1>{Play[option]}</h1>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }
}

