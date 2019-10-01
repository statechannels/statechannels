import React from 'react';

const FlowProcess: React.FC = ({children}) => {
  return (
    <ol aria-atomic role="progressbar">
      {children}
    </ol>
  );
};

export {FlowProcess};
