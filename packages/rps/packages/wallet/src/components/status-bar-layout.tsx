import React from 'react';
import { PureComponent } from 'react';
import NetworkStatus from './network-status';

export default class StatusBarLayout extends PureComponent {
  render() {
    return (
      <div className="d-flex flex-column h-100">
        <NetworkStatus />

        <div className="wallet-body">{this.props.children}</div>

        <div
          className="d-flex flex-row justify-content-end"
          style={{ borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}
        >
          <div style={{ color: 'rgba(0, 0, 0, 0.3)' }}>Magmo wallet v0.0.1</div>
        </div>
      </div>
    );
  }
}
