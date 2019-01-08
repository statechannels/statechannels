import React from 'react';
import { PureComponent } from 'react';

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
    width: '500px',
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
};

export default class SidebarLayout extends PureComponent {
  render() {
    return (
      <Modal isOpen={true} style={customStyles} ariaHideApp={false}>
        {this.props.children}
      </Modal>
    );
  }
}

