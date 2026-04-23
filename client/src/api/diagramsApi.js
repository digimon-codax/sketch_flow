import api from "./index";

export const getDiagrams = async () => {
  const { data } = await api.get('/diagrams');
  return data;
};

export const createDiagram = async (name) => {
  const { data } = await api.post('/diagrams', { name });
  return data;
};

export const getDiagram = async (id) => {
  const { data } = await api.get(`/diagrams/${id}`);
  return data;
};

export const updateDiagram = async (id, payload) => {
  const { data } = await api.patch(`/diagrams/${id}`, payload);
  return data;
};

export const deleteDiagram = async (id) => {
  const { data } = await api.delete(`/diagrams/${id}`);
  return data;
};

export const getMembers = async (id) => {
  const { data } = await api.get(`/diagrams/${id}/members`);
  return data;
};

export const inviteMember = async (id, email) => {
  const { data } = await api.post(`/diagrams/${id}/members`, { email });
  return data;
};
