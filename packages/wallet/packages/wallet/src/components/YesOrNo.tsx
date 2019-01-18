import React, { Fragment } from 'react';
import { Button } from 'reactstrap';
import { StyleSheet, css } from 'aphrodite';

export interface Props {
  yesAction: () => void;
  noAction: () => void;
}

export default class YesOrNo extends React.Component<Props> {
  render() {
    const { yesAction, noAction } = this.props;
    return (
      <Fragment>
        <div className={css(styles.buttonContainer)}>
          <span className={css(styles.button)}>
            <Button onClick={noAction}>No</Button>
          </span>
          <span className={css(styles.button)}>
            <Button onClick={yesAction}>Yes</Button>
          </span>
        </div>
      </Fragment>
    );

  }
}

const styles = StyleSheet.create({
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '5px',
  },
  button: {
    margin: '15px',
  },
});
