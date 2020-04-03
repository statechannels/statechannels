import React from 'react';
import {Spinner} from '../spinner/Spinner';
import {FormButtonProps} from '../types';
import './FormButton.scss';

const FormButton: React.FC<FormButtonProps> = ({
  children,
  onClick,
  name,
  disabled = false,
  spinner = false,
  block = false,
  className = 'button',
  type = 'button'
}: FormButtonProps) => {
  return (
    <button
      id={`${name || className}-button`}
      data-test-selector={`${name || className}-button`}
      disabled={disabled}
      onClick={onClick}
      className={className + (block ? ' block' : '')}
      type={type}
    >
      {spinner ? <Spinner visible={spinner} color="orange" /> : false}
      {children}
    </button>
  );
};

export {FormButton};
