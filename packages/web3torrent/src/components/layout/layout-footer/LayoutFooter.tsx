import React from 'react';

import {RouteComponentProps} from 'react-router-dom';
import './LayoutFooter.scss';

const LayoutFooter: React.FC<RouteComponentProps> = () => (
  <footer>
    <img id="footer-logo" src="/assets/logo.jpeg" alt="Web3Torrent logo" /> Works in Chrome,
    Firefox, and Opera. Source code Available on GitHub. © 2019 WebTorrent, LLC.
  </footer>
);

export {LayoutFooter};
