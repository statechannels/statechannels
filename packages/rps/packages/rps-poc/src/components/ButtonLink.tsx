import React from 'react';
import { Link } from 'react-router-dom';
import { StyleSheet, css } from 'aphrodite';

import { BRAND_COLOR } from '../constants';

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

const styles = StyleSheet.create({
  button: {
    borderRadius: 3,
    padding: '3px 16px 4px',
    backgroundColor: BRAND_COLOR,
    borderColor: '#666',
    borderStyle: 'solid',
    borderWidth: 1,
    color: '#fff',
    transition: 'background-color 0.5s ease',
    boxShadow: '0px 0px 1px',
    textTransform: 'uppercase',
  },

  ':hover': {
    textDecorationLine: 'none',
    backgroundColor: '#aaa',
  },
});
