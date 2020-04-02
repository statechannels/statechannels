import React, {useState} from 'react';
import {clipboardCopy} from '../../../utils/copy-to-clipboard';

export const MagnetLinkButton: React.FC<{}> = () => {
  const [copied, setCopied] = useState(false);

  return (
    <a
      id="download-link"
      href={window.location.href}
      className="fileLink"
      type="button"
      onClick={event => {
        event.preventDefault();
        clipboardCopy(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }}
    >
      <span className={'tooltiptext ' + copied}>
        {copied ? 'Great! Copied to your clipboard' : 'Copy to clipboard'}
      </span>
      Share Link
      <img src="/assets/share-icon.svg" alt="Share Link icon" />
    </a>
  );
};
