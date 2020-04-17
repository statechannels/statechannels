import prettier from 'prettier-bytes';
import React from 'react';
import './ProgressBar.scss';
import {TorrentUI} from '../../../../types';

export type ProgressBarProps = Pick<TorrentUI, 'downloaded' | 'length' | 'status'>;

export const ProgressBar: React.FC<ProgressBarProps> = ({downloaded, length, status}) => {
  return (
    <div className="progress-bar">
      <div
        className={`positive ${downloaded === length ? ' complete' : ''}`}
        style={{width: `${(downloaded / length) * 100}%`}}
      >
        <span className="bar-progress">
          {prettier(downloaded)}/{prettier(length)}
        </span>
        <span className="bar-status">{status}</span>
      </div>
      <div className="negative">
        <span className="bar-progress">
          {prettier(downloaded)}/{prettier(length)}
        </span>
        <span className="bar-status">{status}</span>
      </div>
    </div>
  );
};
