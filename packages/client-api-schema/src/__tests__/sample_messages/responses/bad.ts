import { goodResponses } from './good';

const badResponse = { ...goodResponses[0], id: null };

export const badResponses = [badResponse];
