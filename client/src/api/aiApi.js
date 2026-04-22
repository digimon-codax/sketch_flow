import api from './api';

export const cleanupLayout = async (objects) => {
  const { data } = await api.post('/ai/cleanup', { objects });
  return data; // { layout: [{ id, left, top }] }
};

export const assistArchitecture = async (imageBase64, objects) => {
  const { data } = await api.post('/ai/assist', { imageBase64, objects });
  return data; // { suggestions, scalabilityScore, summary }
};
