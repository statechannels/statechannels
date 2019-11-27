import React from 'react';

const FlowProcess: React.FC = ({children}) => (
  <ol aria-atomic role="progressbar">
    {children}
  </ol>
);

export {FlowProcess};
