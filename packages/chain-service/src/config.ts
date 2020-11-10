const config = {
  rpcEndpoint: process.env.RPC_ENDPOINT,
  serverPrivateKey:
    process.env.SERVER_PRIVATE_KEY ||
    '0x7ab741b57e8d94dd7e1a29055646bafde7010f38a900f55bbd7647880faa6ee8',
};

export default config;
