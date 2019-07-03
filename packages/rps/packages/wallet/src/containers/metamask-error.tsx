import * as states from '../redux/state';
import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
interface Props {
  state: states.WalletState;
}

class InitializingContainer extends PureComponent<Props> {
  render() {
    return (
      <div>
        <h2>A metamask error has occurred.</h2>
        <p>
          Something went wrong loading metamask. Please make sure metamask is installed and has
          permission to access {window.location.hostname}:{window.location.port}.
        </p>
      </div>
    );
  }
}
export default connect(() => ({}))(InitializingContainer);
