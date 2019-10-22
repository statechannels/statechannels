import React from 'react';
import css from './Icon.module.css';

export enum Icons {
  Check = 'check',
  ExternalLink = 'externalLink',
  Hourglass = 'hourglass',
  Link = 'link'
}

export type IconProps = {
  name: Icons;
  decorative?: boolean;
};

export const iconDescriptions: {[key in Icons]: string} = {
  [Icons.ExternalLink]: 'Icon of an arrow exiting a browser window, about to open a new page',
  [Icons.Hourglass]:
    'Icon of an hourglass with sand falling top-down, indicating a wait for something to happen',
  [Icons.Check]: 'Icon of a checkmark, indicating all is well',
  [Icons.Link]: 'Icon of a chain binding, indicating a connection between things'
};

const Icon: React.FC<IconProps> = ({name, decorative}) => (
  <span
    aria-hidden={decorative}
    aria-label={iconDescriptions[name]}
    role="img"
    className={`${css.icon} ${css[name]}`}
  ></span>
);

export {Icon};
