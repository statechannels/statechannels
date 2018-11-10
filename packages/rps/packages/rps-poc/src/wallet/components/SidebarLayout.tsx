import React from 'react';
import { PureComponent } from 'react';

import Sidebar from 'react-sidebar';

interface Props {
  contents: any;
}

export default class WalletController extends PureComponent<Props> {
  render() {
    return <Sidebar
      sidebar={this.props.contents}
      open={true}
      styles={{ sidebar: { width: "450px", zIndex: "1040", background: "#f3f3f3" } }}
      overlayClassName="wallet-overlay"
    >
      {this.props.children}
    </Sidebar>;
  }
}
