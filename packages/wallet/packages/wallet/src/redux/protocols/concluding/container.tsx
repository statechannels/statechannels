import * as states from './states';
import { PureComponent } from 'react';
import React from 'react';
import * as concludingInstigatorStates from './instigator/states';
import * as concludingResponderStates from './responder/states';
import { connect } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Concluding as ConcludingInstigator } from './instigator/container';
import { Concluding as ConcludingResponder } from './responder/container';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

interface Props {
  state: states.ConcludingState;
}

class ConcludingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    if (
      concludingInstigatorStates.isConcludingInstigatorState(state) &&
      !states.isTerminalConcludingState(state)
    ) {
      return <ConcludingInstigator state={state} />;
    }

    if (
      concludingResponderStates.isConcludingResponderState(state) &&
      !states.isTerminalConcludingState(state)
    ) {
      return <ConcludingResponder state={state} />;
    }
    // TODO: We need a placeholder screen here when transitioning back to the app from a success state
    return (
      <div>
        <FontAwesomeIcon icon={faSpinner} pulse={true} size="lg" />
      </div>
    );
  }
}

export const Concluding = connect(() => ({}))(ConcludingContainer);
