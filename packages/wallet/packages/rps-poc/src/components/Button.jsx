import React from 'react';

import { Link } from 'react-router-dom';

export default function Button({ children, href }) {
  return (
    <Link className="button" to={href}>
      {children}
    </Link>
  );
}
