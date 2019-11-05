import React from 'react';
import './Spinner.scss';

export type SpinnerProps = {
  visible?: boolean;
  type?: 'circle' | 'dots';
  color?: 'black' | 'white' | 'orange';
  content?: React.ReactNode;
};

const Spinner: React.FC<SpinnerProps> = ({
  visible = false,
  type = 'circle',
  color = 'black',
  content
}: SpinnerProps) => {
  if (type === 'circle') {
    return (
      <div
        className={`spinner spinner--circle spinner--color-${color} ${
          !visible ? 'spinner--hidden' : ''
        }`}
      />
    );
  } else {
    return (
      <div className={`spinner spinner--loading ${!visible ? 'spinner--hidden' : ''}`}>
        <div className="spinner-loading">
          <div className="bounce1" />
          <div className="bounce2" />
          <div className="bounce3" />
        </div>
        {content}
      </div>
    );
  }
};
export {Spinner};
