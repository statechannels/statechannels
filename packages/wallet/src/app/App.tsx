import React from "react";
import { MessageListener } from "../message-listener/MessageListener";
import "./App.css";

const App: React.FC = () => {
  return (
    <div>
      <MessageListener />
    </div>
  );
};

export default App;
