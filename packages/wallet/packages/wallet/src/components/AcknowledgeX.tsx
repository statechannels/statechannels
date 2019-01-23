import React from 'react';
import { Button } from 'reactstrap';
import { StyleSheet, css } from 'aphrodite';
import SidebarLayout from './SidebarLayout';
import magmoFireBall from '../images/fireball.svg';

interface Props {
  title: string;
  action: () => void;
  actionTitle: string;
  description: string;
}

export default class AcknowledgeX extends React.PureComponent<Props> {
  render() {
    const { title, action, actionTitle, description } = this.props;
    return (
      <SidebarLayout>
        <h1>
          {title}
        </h1>
        <p>
          {description}
        </p>
        <div className="challenge-expired-button-container" >
          <span className={css(styles.button)}>
            <Button onClick={action} >
            <img src={magmoFireBall}/>&nbsp;&nbsp;{actionTitle}
            </Button>
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