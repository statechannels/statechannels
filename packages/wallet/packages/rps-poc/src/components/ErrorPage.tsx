import _ from 'lodash';
import React from 'react';

interface Props {
  error: string;
}

const initialState = {};
type State = Readonly<typeof initialState>;

export default class ErrorPage extends React.PureComponent<Props, State> {
  readonly state: State = initialState;

  constructor(props) {
    super(props);
  }

  render() {
    return <div> Error: {this.props.error} </div>;
  }
}