import React from 'react';
import { PureComponent } from 'react';
import NetworkStatus from './NetworkStatus';
import Modal from 'react-modal';

// todo: style to appear from the left as per:
// https://github.com/DimitryDushkin/sliding-pane/blob/master/src/index.styl

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: '320px',
    height: '450px',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
};

export default class SidebarLayout extends PureComponent {
  render() {
    return (
      <Modal isOpen={true} style={customStyles} ariaHideApp={false}>
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
      </Modal>
    );
  }
}
