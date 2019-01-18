import React from 'react';
import WaitForXConfirmation from '../WaitForXConfirmation';

export default class WaitForResponseConfirmation extends React.PureComponent<{}> {
  render() {
    return <WaitForXConfirmation name='response' />;
  }
}
