import React from 'react';
import { Link } from 'react-router-dom';
import { StyleSheet, css } from 'aphrodite';

import { buttonStyles } from './Button';

interface IProps {
  children: any;
  href: string;
}

const ButtonLink: React.SFC<IProps> = ({ children, href }) => {
  return (
    <Link to={href} className={css(styles.button)}>
      {children}
    </Link>
  );
};

export default ButtonLink;

const styles = StyleSheet.create(buttonStyles);
