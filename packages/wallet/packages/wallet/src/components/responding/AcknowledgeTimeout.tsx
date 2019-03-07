import React from 'react';
import Button from 'reactstrap/lib/Button';
import SidebarLayout from '../SidebarLayout';
import { StyleSheet, css } from 'aphrodite';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHourglassEnd } from '@fortawesome/free-solid-svg-icons';

const timeOutIcon = (
  <span className="fa-li">
    <FontAwesomeIcon icon={faHourglassEnd} size="lg" color="red" />
  </span>
);

export enum ChallengeOptions {
  RespondWithMove,
  RespondWithExistingMove,
}

interface Props {
  expiryTime: number;
  timeoutAcknowledged: () => void;
}

export default class AcknowledgeTimeout extends React.PureComponent<Props> {
  render() {
    const { expiryTime, timeoutAcknowledged } = this.props;
    const expiryDate = new Date(expiryTime * 1000).toLocaleTimeString().replace(/:\d\d /, ' ');
    // TODO: We should add hover text or an icon to these options to fully explain what they mean to the user.
    return (
      <SidebarLayout>
        <h2>You failed to respond!</h2>
        <div>
          The game expired at
          <ul className="fa-ul">
            <li style={{ padding: '0.7em 1em' }}>
              {timeOutIcon}
              {expiryDate}
            </li>
          </ul>
          <br />
        </div>
        <div className="challenge-expired-button-container">
          <span className={css(styles.button)}>
            <Button onClick={timeoutAcknowledged}>Withdraw your funds</Button>
          </span>
        </div>
      </SidebarLayout>
    );
  }
}

const styles = StyleSheet.create({
  button: {
    margin: '8px',
  },
});
