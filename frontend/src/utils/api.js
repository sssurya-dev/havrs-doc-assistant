import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await API.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const analyzeDocument = async (documentId) => {
  const res = await API.post(`/documents/${documentId}/analyze`);
  return res.data;
};

export const getDocument = async (documentId) => {
  const res = await API.get(`/documents/${documentId}`);
  return res.data;
};

export const getAllDocuments = async () => {
  const res = await API.get('/documents');
  return res.data;
};

export const chatWithDocument = async (documentId, message, sessionId = null) => {
  const res = await API.post('/chat', {
    documentId,
    message,
    sessionId,
  });
  return res.data;
};