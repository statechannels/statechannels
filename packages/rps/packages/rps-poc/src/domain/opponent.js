import nanoid from 'nanoid';

export default function Opponent({ name, wager }) {
  return {
    id: nanoid(),
    name,
    wager,
    timestamp: (new Date()).toString(),
  }
}
