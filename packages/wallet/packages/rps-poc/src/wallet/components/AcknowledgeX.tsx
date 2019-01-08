import React from 'react';
import Button from 'reactstrap/lib/Button';
import walletIcon from '../../images/wallet_icon.svg';
import SidebarLayout from './SidebarLayout';

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
        <img src={walletIcon} />
        <div className="challenge-expired-title">
          {title}
        </div>
        <p>
          {description}
        </p>
        <div className="challenge-expired-button-container" >
          <Button className="challenge-expired-button" onClick={action} >
            {actionTitle}
          </Button>
        </div>
      </SidebarLayout>
    );
  }
}
