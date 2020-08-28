import {React} from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true
});

const Mermaid = ({chart}) => {
  useEffect(() => {
    mermaid.contentLoaded();
  }, []);
  return <div className="mermaid">{chart}</div>;
};

export default Mermaid;

// https://github.com/facebook/docusaurus/issues/1258
