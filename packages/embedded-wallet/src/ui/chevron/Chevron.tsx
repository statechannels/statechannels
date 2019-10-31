import React from 'react';
import css from './Chevron.module.css';

export type ChevronDirection = 'up' | 'right' | 'down' | 'left';

export type ChevronProps = {
  direction: ChevronDirection;
};

const Chevron: React.FC<ChevronProps> = ({direction}) => (
  <span className={`${css.chevron} ${css[direction]}`}></span>
);

export {Chevron};
