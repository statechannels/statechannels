import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default function Button({ children, onClick }) {
  return (
    <button onClick={onClick} type="button" className="button">
      {children}
    </button>
  );
}

Button.propTypes = propTypes;
