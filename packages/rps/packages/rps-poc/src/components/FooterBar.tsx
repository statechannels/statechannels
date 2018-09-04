import React, { ReactChild } from 'react';
import { StyleSheet, css } from 'aphrodite';

interface Props {
  children: ReactChild;
}

export default class FooterBar extends React.PureComponent<Props> {
  render() {
    const { children } = this.props;

    return (
      <div className={css(styles.footerBar)}>
        <div className={css(styles.children)}>{children}</div>
      </div>
    );
  }
}

const styles = StyleSheet.create({
  footerBar: {
    position: 'fixed',
    bottom: 0,
    height: 50,
    left: 0,
    right: 0,
    borderTopColor: 'black',
    borderTopStyle: 'solid',
    borderTopWidth: 1,
  },

  children: {
    paddingTop: 14,
    maxWidth: '90%',
    margin: 'auto',
  },
});
