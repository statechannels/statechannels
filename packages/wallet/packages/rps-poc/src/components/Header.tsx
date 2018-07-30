import * as React from 'react';
import { Link } from 'react-router-dom';

import { BRAND_COLOR, ROUTE_PATHS  } from '../constants';

export default function Header() {
  return (
    <div
      style={{
        backgroundColor: BRAND_COLOR,
        borderBottomColor: '#bbb',
        borderBottomStyle: 'solid',
        borderBottomWidth: 1,
        color: '#fff',
        height: 42,
        width: '100%',
      }}
    >
      <div style={{ position: 'absolute', left: 20 }}>
        <Link to="/">
          <h3>RPS</h3>
        </Link>
      </div>
      <div
        style={{
          left: '50%',
          position: 'absolute',
          transform: 'translateX(-50%)',
        }}
      >
        <h3>Rock, Paper, Scissors</h3>
      </div>
      <div style={{ position: 'absolute', right: 20, top: 0 }}>
        <Link style={{ display: 'inline-block', marginRight: 16 }} to="/">
          <h3>Home</h3>
        </Link>
        <Link style={{ display: 'inline-block' }} to={`/${ROUTE_PATHS.ABOUT}`}>
          <h3>About</h3>
        </Link>
      </div>
    </div>
  );
}
