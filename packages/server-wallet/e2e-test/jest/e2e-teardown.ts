module.exports = async (): Promise<void> => {
  console.log(`\nTerminating Pong server ...`);
  (global as any).server.close();
};
