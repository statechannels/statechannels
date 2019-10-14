import prettier from 'prettier-bytes';
import React from 'react';
import {remove} from '../../../../clients/web3torrent-client';
import {Torrent} from '../../../../types';
import './ProgressBar.scss';

export type ProgressBarProps = Pick<Torrent, 'downloaded' | 'length' | 'status' | 'infoHash'>;

export const ProgressBar: React.FC<ProgressBarProps> = ({downloaded, length, status, infoHash}) => {
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
        <button type="button" className="bar-cancelButton">
          <svg>
            <path d="M0,20,20,0" />
            <path d="M0,0,20,20" />
          </svg>
        </button>
      </div>
      <div className="negative">
        <span className="bar-progress">
          {prettier(downloaded)}/{prettier(length)}
        </span>
        <span className="bar-status">{status}</span>
        <button type="button" className="bar-cancelButton" onClick={() => remove(infoHash)}>
          <svg>
            <path d="M0,20,20,0" />
            <path d="M0,0,20,20" />
          </svg>
        </button>
      </div>
    </div>
  );
};
