import React, {useState} from 'react';
import {Chevron} from '../chevron/Chevron';
import css from './Expandable.module.css';

export type ExpandableProps = {
  shouldShowContent?: boolean;
  title: string;
};

const Expandable: React.FC<ExpandableProps> = ({shouldShowContent = false, title, children}) => {
  const [showContent, setShowContent] = useState<boolean>(shouldShowContent);

  return (
    <section className={css.expandable}>
      <div
        data-test-selector="expandable-title"
        className={css.labelContainer}
        onClick={() => setShowContent(!showContent)}
      >
        <label className={css.label}>{title}</label>
        <Chevron direction={showContent ? 'up' : 'down'}></Chevron>
      </div>
      <div data-test-selector="expandable-content">{showContent && children}</div>
    </section>
  );
};

export {Expandable};
