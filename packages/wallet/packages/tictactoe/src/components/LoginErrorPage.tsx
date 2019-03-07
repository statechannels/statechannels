import * as React from 'react';

interface LoginErrorProps {
  error: string;
}

export default function LoginErrorPage(props: LoginErrorProps) {
  return (
    <div className="container centered-container w-100 mb-5">
      <div className="w-100 text-center mb-5">
        <h1 className="text-center waiting-room-title">Login Error</h1>
        <div>
          <p>{props.error}</p>
        </div>
      </div>
    </div>
  );
}
