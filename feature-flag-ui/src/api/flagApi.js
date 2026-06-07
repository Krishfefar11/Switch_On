import axiosInstance from './axiosInstance';

export const getFlags      = (params)       => axiosInstance.get('/flags', { params });
export const getFlagById   = (id)           => axiosInstance.get(`/flags/${id}`);
export const createFlag    = (data)         => axiosInstance.post('/flags', data);
export const updateFlag    = (id, data)     => axiosInstance.patch(`/flags/${id}`, data);
export const toggleFlag    = (id)           => axiosInstance.patch(`/flags/${id}/toggle`);
export const deleteFlag    = (id)           => axiosInstance.delete(`/flags/${id}`);
export const archiveFlag   = (id)           => axiosInstance.patch(`/flags/${id}/archive`);
export const unarchiveFlag = (id)           => axiosInstance.patch(`/flags/${id}/unarchive`);
export const promoteFlag   = (id, data)     => axiosInstance.post(`/flags/${id}/promote`, data);
export const bulkFlagAction = (action, ids) => axiosInstance.post('/flags/bulk', { action, ids });
