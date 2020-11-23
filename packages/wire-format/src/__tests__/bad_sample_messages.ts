export const dataMissing = {
  recipient: 'alice',
  sender: 'bob',
};

export const extraProperty = {
  recipient: 'alice',
  sender: 'bob',
  data: {},
  iShouldntBeHere: true,
};

export const emptyState = {
  recipient: 'alice',
  sender: 'bob',
  data: {
    signedStates: [{}],
  },
};

export const emptyStringObjectives = {
  recipient: 'alice',
  sender: 'bob',
  data: {
    objectives: '',
  },
};

export const nullObjectives = {
  recipient: 'alice',
  sender: 'bob',
  data: {
    objectives: null,
  },
};
