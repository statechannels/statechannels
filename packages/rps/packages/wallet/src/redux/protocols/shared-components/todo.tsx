import React from 'react';

interface Props {
  stateType: string;
}

export default class Todo extends React.PureComponent<Props> {
  render() {
    return (
      <div>
        <h2>TODO: Screen not implemented!</h2>
        <p>
          Screen has not yet been built for the <strong>{this.props.stateType}</strong>!
        </p>
      </div>
    );
  }
}
