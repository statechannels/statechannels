import React, { ReactNode } from 'react';
import Modal from 'react-modal';
import { css, StyleSheet } from 'aphrodite';

interface Props {
  children: ReactNode;
}

export default class WalletLayout extends React.PureComponent<Props> {
  render() {
    return (
      <Modal isOpen={true}>
        <div className={css(styles.topBar)}>
          <h2>Channel Wallet</h2>
        </div>
        <p>{this.props.children}</p>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  topBar: {
    borderBottom: 'solid 1px #000',
  },
});
