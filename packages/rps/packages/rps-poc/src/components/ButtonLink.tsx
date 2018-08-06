import React from 'react';
import { Link } from 'react-router-dom';

interface IProps {
  children: any;
  href: string;
}

const ButtonLink: React.SFC<IProps> = ({ children, href }) => {
  return (
    <Link className="button" to={href}>
      {children}
    </Link>
  );
};

export default ButtonLink;
