import { StyleSheet, css } from 'aphrodite';
import React from 'react';
import Loader from 'react-loader-spinner';

export default function LoadingPage() {
  return (
    <div className={css(styles.loader)}>
      <Loader type="Circles" color="grey" height={100} width={100} />
    </div>
  );
}
const styles = StyleSheet.create({
  loader: {
    'align-items': 'center',
    display: 'flex',
    'justify-content': 'center',
    height: '300px',
  },
});
