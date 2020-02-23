import React from 'react';

import {RouteComponentProps} from 'react-router-dom';
import './LayoutFooter.scss';

const LayoutFooter: React.FC<RouteComponentProps> = () => (
  <footer>
    <img className="footer-logo" src="/assets/logo.svg" alt="Web3Torrent logo" />
    <span className="footer-text">
      Works in Chrome, Firefox, and Opera. Source code Available on GitHub. © 2020 State Channels.
    </span>
  </footer>
);

export {LayoutFooter};
