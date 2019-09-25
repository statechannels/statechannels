import React, { Fragment } from 'react';

interface Props {
  name: string;
  reason: string;
}

// todo: should we even have this screen? It shouldn't ever be shown,
// as the parent protocol should take control in the case of failure.
export default class Failure extends React.PureComponent<Props> {
  render() {
    const { name, reason } = this.props;
    return (
      <Fragment>
        <h2>The {name} process failed</h2>
        <p>The {name} process failed due to:</p>
        <p>{reason}</p>
        <p>You should be redirected shortly.</p>
      </Fragment>
    );
  }
}
