import React from 'react';
import PropTypes from 'prop-types';

import { Play } from '../game-engine/pledges/';

interface Props {
  selectedPlayId: number;
};

export default class WaitForOpponentStep extends React.PureComponent<Props> {
  static propTypes = {
    selectedPlayId: PropTypes.number.isRequired,
  };

  render() {
    const { selectedPlayId } = this.props;

    return (
      <div style={{ maxWidth: '90%', margin: 'auto' }}>
        <div>
          <h1>Waiting for opponent...</h1>
        </div>
        {selectedPlayId && (
          <div style={{ width: '100%' }}>
            You&apos;ve chosen {Play[selectedPlayId]}
          </div>
        )}
      </div>
    );
  }
}