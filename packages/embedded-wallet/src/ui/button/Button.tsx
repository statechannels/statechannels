import React from "react";
import css from "./Button.module.css";

export type ButtonProps = {
  icon?: string;
  type: "primary" | "secondary";
  label: string;
  onClick: () => void;
};

const Button: React.FC<ButtonProps> = ({ type, label, onClick }) => {
  return (
    <button autoFocus={type === "primary"} onClick={onClick} className={`${css.button} ${css[type]}`}>
      {label}
    </button>
  );
};

export { Button };
