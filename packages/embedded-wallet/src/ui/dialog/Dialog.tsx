import React from "react";
import { Button, ButtonProps } from "../button/Button";
import css from "./Dialog.module.css";

export type DialogButtonProps = Omit<ButtonProps, "type">;

export type DialogProps = {
  title?: string;
  buttons?: {
    primary: DialogButtonProps;
    secondary?: DialogButtonProps;
  };
  onClose?: () => void;
};

const Dialog: React.FC<DialogProps> = ({ title, children, buttons, onClose }) => {
  return (
    <div className={css.backdrop}>
      <dialog open={true} className={`${css.dialog} ${css.animateDialog}`}>
        <header className={css.header}>
          <span className={css.icon}></span>
          {title ? <h1 className={css.title}>{title}</h1> : {}}
          <span onClick={onClose} className={css.close}></span>
        </header>
        <section className={css.content}>{children}</section>
        {buttons ? (
          <footer className={css.footer}>
            {buttons.secondary ? <Button {...buttons.secondary} type="secondary" /> : []}
            <Button {...buttons.primary} type="primary" />
          </footer>
        ) : (
          {}
        )}
      </dialog>
    </div>
  );
};

export { Dialog };
