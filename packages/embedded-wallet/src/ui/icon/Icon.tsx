import React from "react";
import css from "./Icon.module.css";

export enum Icons {
  OpenExternalSite = "openExternalSite",
  Spinner = "spinner",
  Hourglass = "hourglass",
  Check = "check"
}

export type IconProps = {
  name: Icons;
  color?: "primary" | "inverse";
  decorative?: boolean;
};

const iconDescriptions: { [key in Icons]: string } = {
  [Icons.OpenExternalSite]: "Icon of an arrow exiting a browser window, about to open a new page",
  [Icons.Spinner]: "Icon of a rotating circle, indicating something is going on",
  [Icons.Hourglass]: "Icon of an hourglass with sand falling top-down, indicating a wait for something to happen",
  [Icons.Check]: "Icon of a checkmark, indicating all is well"
};

const Icon: React.FC<IconProps> = ({ name, color = "primary", decorative }) => (
  <span
    aria-hidden={decorative}
    aria-label={iconDescriptions[name]}
    role="img"
    className={`${css.icon} ${name} ${color}`}
  ></span>
);

export { Icon };
