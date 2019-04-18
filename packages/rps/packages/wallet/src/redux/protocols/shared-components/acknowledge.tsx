import React, { Fragment } from 'react';
import { Button } from 'reactstrap';

interface Props {
  title: string;
  description: string;
  acknowledge: () => void;
}

export default class Acknowledge extends React.PureComponent<Props> {
  render() {
    const { acknowledge, title, description } = this.props;
    return (
      <Fragment>
        <h1>{title}</h1>
        <p>{description}</p>
        <Button onClick={acknowledge}>Ok</Button>
      </Fragment>
    );
  }
}
