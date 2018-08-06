import React from 'react';

interface IProps {
  children: any;
  onClick: () => any;
}

const Button: React.SFC<IProps> = ({ children, onClick }) => {
  return (
    <button onClick={onClick} type="button" className="button">
      {children}
    </button>
  );
};

export default Button;
