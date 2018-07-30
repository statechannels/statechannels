import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

const propTypes = {
  children: PropTypes.node.isRequired,
  href: PropTypes.string.isRequired,
};

export default function ButtonLink({ children, href }) {
  return (
    <Link className="button" to={href}>
      {children}
    </Link>
  );
}

ButtonLink.propTypes = propTypes;
