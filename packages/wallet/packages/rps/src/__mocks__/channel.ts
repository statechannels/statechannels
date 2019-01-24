// __mocks__/sound-player.js

// Import this named export into your test file:
export const mockId = jest.fn();
const mock = jest.fn().mockImplementation(() => {
  return {id: mockId};
});

export default mock;