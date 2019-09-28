import React, { Dispatch, KeyboardEvent, SetStateAction, useState } from "react";
import { Button, ButtonProps } from "../button/Button";
import { Icon, Icons } from "../icon/Icon";
import css from "./Dialog.module.css";

export type DialogButtonProps = Omit<ButtonProps, "type">;

export type DialogProps = {
  title?: string;
  icon?: Icons;
  buttons?: {
    primary: DialogButtonProps;
    secondary?: DialogButtonProps;
  };
  closable?: boolean;
  onClose?: () => void;
};

const onDialogKeyDown = (onClose?: () => void) => (event: KeyboardEvent<HTMLDialogElement>) => {
  if (event.key === "Escape" && onClose) {
    onClose();
  }
};

export type DialogContextProps = { ready?: boolean };

const DialogContext = React.createContext<DialogContextProps>({});

const onDialogAnimationEnd = (setAnimationFinished: Dispatch<SetStateAction<boolean>>) => () =>
  setAnimationFinished(true);

const Dialog: React.FC<DialogProps> = ({ title, icon, children, buttons, onClose, closable = true }) => {
  const [animationFinished, setAnimationFinished] = useState<boolean>(false);

  return (
    <div className={css.backdrop}>
      <dialog
        onAnimationEnd={onDialogAnimationEnd(setAnimationFinished)}
        open={true}
        onKeyDown={onDialogKeyDown(onClose)}
        className={`${css.dialog} ${css.animateDialog}`}
      >
        <header className={css.header}>
          <span className={css.icon}></span>
          {title ? (
            <h1 className={css.title}>
              {icon ? <Icon name={icon} color="primary" /> : {}}
              {title}
            </h1>
          ) : (
            {}
          )}
          {closable ? <button onClick={onClose} className={css.close}></button> : {}}
        </header>
        {children ? (
          <section className={css.content}>
            <DialogContext.Provider value={{ ready: animationFinished }}>{children}</DialogContext.Provider>
          </section>
        ) : (
          []
        )}
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

export { Dialog, DialogContext };
