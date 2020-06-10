import React from 'react';

import {RouteComponentProps} from 'react-router-dom';
import './LayoutFooter.scss';
import {VERSION, COMMIT_HASH} from '../../../constants';

const LayoutFooter: React.FC<RouteComponentProps> = () => (
  <footer>
    <img className="footer-logo" src="/assets/logo.svg" alt="Web3Torrent logo" />
    <span className="footer-text">
      Works in Chrome, Firefox, Brave and Opera. Source code{' '}
      <a
        href={`https://github.com/statechannels/monorepo/tree/${COMMIT_HASH}/packages/web3torrent`}
        target="_blank"
        rel="noopener noreferrer"
      >
        here
      </a>
      . © 2020 State Channels.
      <a
        href={`https://github.com/statechannels/monorepo/tree/${COMMIT_HASH}/packages/web3torrent`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {'  ' + VERSION}
      </a>
    </span>
  </footer>
);

export {LayoutFooter};
