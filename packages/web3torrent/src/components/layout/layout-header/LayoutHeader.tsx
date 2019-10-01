import React from 'react';
import {FormButton} from '../../form';

import {RouteComponentProps} from 'react-router-dom';
import {RoutePath} from '../../../routes';

import './LayoutHeader.scss';

const LayoutHeader: React.FC<RouteComponentProps> = props => {
  return (
    <header className="header">
      <nav className="header-content">
        <a className="header-logo" href={RoutePath.Root}>
          <span className="header-logo-hidden">Web3Torrent Logo - Go to Home</span>
        </a>
        <div className="actions-container">
          <FormButton name="setup" onClick={() => props.history.push(RoutePath.Upload)}>
            Upload
          </FormButton>{' '}
        </div>
      </nav>
    </header>
  );
};

export {LayoutHeader};
