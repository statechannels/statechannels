import {StyleSheet, css} from 'aphrodite';
import React from 'react';
import {Loader} from 'rimble-ui';

export default function LoadingPage() {
  return (
    <div className={css(styles.loader)}>
      <Loader color="red" size="80px" />
    </div>
  );
}
const styles = StyleSheet.create({
  loader: {
    'align-items': 'center',
    display: 'flex',
    'justify-content': 'center',
    height: '300px',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
  },
});
