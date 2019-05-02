import React from 'react';
// import walletIcon from '../../images/wallet-iconn.svg';
import YesOrNo from './yes-or-no';

interface Props {
  yesMessage: string;
  noMessage: string;
  title: string;
  approvalAction: () => void;
  rejectionAction: () => void;
  description: string;
}

export default class ApproveX extends React.PureComponent<Props> {
  render() {
    const {
      yesMessage,
      noMessage,
      approvalAction,
      rejectionAction,
      title,
      description,
      children,
    } = this.props;
    return (
      <div>
        <h2>{title}</h2>

        {children}

        <p>{description}</p>

        <YesOrNo
          yesAction={approvalAction}
          noAction={rejectionAction}
          yesMessage={yesMessage}
          noMessage={noMessage}
        />
      </div>
    );
  }
}
