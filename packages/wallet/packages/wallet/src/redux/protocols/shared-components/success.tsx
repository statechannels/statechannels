import React, { Fragment } from 'react';

interface Props {
  name: string;
}

// todo: should we even have this screen? It shouldn't ever be shown,
// as the parent protocol should take control in the case of success.
export default class Success extends React.PureComponent<Props> {
  render() {
    const { name } = this.props;
    return (
      <Fragment>
        <h2>Success!</h2>
        <p>Your {name} was successful.</p>
        <p>You should be redirected shortly.</p>
      </Fragment>
    );
  }
}
