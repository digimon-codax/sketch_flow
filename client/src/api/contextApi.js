import api from './api';

export const getContext = async (elementId) => {
  const { data } = await api.get(`/context/${elementId}`);
  return data;
};

export const updateContext = async (elementId, payload) => {
  const { data } = await api.patch(`/context/${elementId}`, payload);
  return data;
};

export const uploadFile = async (elementId, formData) => {
  const { data } = await api.post(`/context/${elementId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteFile = async (elementId, fileId) => {
  const { data } = await api.delete(`/context/${elementId}/files/${fileId}`);
  return data;
};
