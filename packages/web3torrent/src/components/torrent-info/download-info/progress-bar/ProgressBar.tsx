import React from 'react';
import './ProgressBar.scss';

export type ProgressBarProps = {
  downloaded: number;
  size: number;
  status: 'Completed' | 'Downloading';
  stopAction?: () => void;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  downloaded,
  size,
  status = 'Downloading'
}: ProgressBarProps) => {
  return (
    <div className="progress-bar" data-label={downloaded + '/' + size}>
      <span className="filler" style={{width: `${(downloaded / size) * 100}%`}} />
      <span className="bar-progress">
        {downloaded}Mb/{size}Mb
      </span>
      <span className="bar-status">{status}</span>
      <button type="button" className="bar-cancelButton">
        <svg>
          <path d="M0,20,20,0" />
          <path d="M0,0,20,20" />
        </svg>
      </button>
    </div>
  );
};
