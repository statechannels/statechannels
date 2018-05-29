import React from 'react';

import { Link } from 'react-router-dom';

export default function ButtonLink({ children, href }) {
  return (
    <Link className="button" to={href}>
      {children}
    </Link>
  );
}
