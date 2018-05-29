import React from 'react';

export default function Button({ children, onClick }) {
  return (
    <a onClick={onClick} className="button">
      {children}
    </a>
  );
}
