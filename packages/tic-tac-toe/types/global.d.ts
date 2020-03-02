// Types for compiled templates
declare module '@statechannels/tic-tac-toe/templates/*' {
  import {TemplateFactory} from 'htmlbars-inline-precompile';
  const tmpl: TemplateFactory;
  export default tmpl;
}
