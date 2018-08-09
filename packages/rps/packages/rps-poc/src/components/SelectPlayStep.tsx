import React from 'react';
import PropTypes from 'prop-types';

import { PLAY_OPTIONS } from '../constants';

interface Props {
  handleSelectPlay: any;
  afterOpponent?: any;
}

export default class SelectPlayStep extends React.PureComponent<Props> {
  static propTypes = {
    afterOpponent: PropTypes.bool.isRequired,
    handleSelectPlay: PropTypes.func.isRequired,
  };

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
            <button
              type="button"
              onClick={() => handleSelectPlay(option.id)}
              style={{ display: 'inline-block', width: '33%' }}
              key={option.id}
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
                  <h1>{option.name}</h1>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }
}

