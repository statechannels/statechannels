import * as states from '../states';
import React, { PureComponent } from 'react';
import SidebarLayout from '../components/SidebarLayout';
import LandingPage from '../components/LandingPage';
import { connect } from 'react-redux';
interface Props {
  state: states.InitializingState;
}

class InitializingContainer extends PureComponent<Props> {
  render() {
    const { state } = this.props;
    switch (state.type) {
      case states.METAMASK_ERROR:
        return (
          <SidebarLayout>
            <h1>A metamask error has occurred.</h1>
            <p>
              Something went wrong loading metamask.
              Please make sure metamask is installed and has permission to access {window.location.href}.
            </p>
          </SidebarLayout>
        );
      default:
        return <LandingPage />;
    }
  }
}
export default connect(
  () => ({}),
)(InitializingContainer);
