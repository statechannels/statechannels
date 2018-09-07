import React, { ReactNode } from 'react';
import Modal from 'react-modal';
import { css, StyleSheet } from 'aphrodite';

interface Props {
  children: ReactNode;
}

export default class WalletLayout extends React.PureComponent<Props> {
  componentWillMount() {
    Modal.setAppElement('body');
  }

  render() {
    return (
      <Modal isOpen={true}>
        <div className={css(styles.topBar)}>
          <h2>Channel Wallet</h2>
        </div>
        {this.props.children}
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  topBar: {
    borderBottom: 'solid 1px #000',
  },
});
