import React from 'react';

import {Link, RouteComponentProps} from 'react-router-dom';
import {RoutePath} from '../../../routes';

import './LayoutHeader.scss';

const LayoutHeader: React.FC<RouteComponentProps> = props => {
  return (
    <header className="header">
      <nav className="header-content">
        <Link className="header-logo" to={RoutePath.Root}>
          <span className="header-logo-hidden">Web3Torrent Logo - Go to Home</span>
        </Link>
      </nav>
    </header>
  );
};

export {LayoutHeader};
