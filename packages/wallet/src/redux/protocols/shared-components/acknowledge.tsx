import React, {Fragment} from "react";
import {Button} from "reactstrap";

interface Props {
  title: string;
  description: string;
  acknowledge: () => void;
}

export default class Acknowledge extends React.PureComponent<Props> {
  render() {
    const {acknowledge, title, description} = this.props;
    return (
      <Fragment>
        <h2>{title}</h2>
        <p>{description}</p>
        <Button color="primary" onClick={acknowledge}>
          Ok
        </Button>
      </Fragment>
    );
  }
}
