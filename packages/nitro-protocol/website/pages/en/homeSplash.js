const React = require('react');
const CompLibrary = require('../../core/CompLibrary.js');
const Container = CompLibrary.Container;
const GridBlock = CompLibrary.GridBlock;

const Block = props => (
  <Container padding={['bottom', 'top']} id={props.id} background={props.background}>
    <GridBlock align="center" contents={props.children} layout={props.layout} />
  </Container>
);

class HomeSplash extends React.Component {
  render() {
    const {config: siteConfig, language = ''} = this.props;
    const {baseUrl, docsUrl} = siteConfig;
    const docsPart = `${docsUrl ? `${docsUrl}/` : ''}`;
    const langPart = `${language ? `${language}/` : ''}`;
    const docUrl = doc => `${baseUrl}${docsPart}${langPart}${doc}`;

    const SplashContainer = props => (
      <div className="homeContainer">
        <div className="homeSplashFade">
          <div className="wrapper homeWrapper">{props.children}</div>
        </div>
      </div>
    );

    const ProjectTitle = () => (
      <h2 className="projectTitle">
        {siteConfig.title}
        <small>{siteConfig.tagline}</small>
      </h2>
    );

    const PromoSection = props => (
      <div className="section promoSection">
        <div className="promoRow">
          <div className="pluginRowBlock">{props.children}</div>
        </div>
      </div>
    );

    const Button = props => (
      <div className="pluginWrapper buttonWrapper">
        <a className="button" href={props.href} target={props.target}>
          {props.children}
        </a>
      </div>
    );

    const Features = () => (
      <Block layout="threeColumn">
        {[
          {
            content: 'Bootstraps from the Ethereum blockchain',
            image: `${baseUrl}img/ethereum-logo.svg`,
            imageAlign: 'top',
            title: 'Secure',
          },
          {
            content: 'Allows for ultra-low latency apps',
            image: `${baseUrl}img/motorcycle.svg`,
            imageAlign: 'top',
            title: 'Fast',
          },
          {
            content: 'Optimized for low cost',
            image: `${baseUrl}img/gas.svg`,
            imageAlign: 'top',
            title: 'Cheap',
          },
        ]}
      </Block>
    );

    return (
      <div>
        <SplashContainer>
          <div className="inner">
            <img src={`${baseUrl}img/motorcycle.svg`} />
            <ProjectTitle siteConfig={siteConfig} />
          </div>
          <PromoSection>
            <Button href={docUrl('overview')}>Documentation</Button>
            <Button href={siteConfig.packageUrl}>Code</Button>
          </PromoSection>
          <Features />
        </SplashContainer>
      </div>
    );
  }
}

module.exports = HomeSplash;
