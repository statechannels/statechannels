export interface IConfig {
  port: number;
  prettyLog: boolean;
}

const config = {
  port: process.env.PORT || 3002,
  prettyLog: process.env.NODE_ENV === 'development',
};

export { config };
