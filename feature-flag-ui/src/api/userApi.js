import axiosInstance from './axiosInstance';

export const getUsers = (params) => axiosInstance.get('/users', { params });
export const updateRole = (id, role) => axiosInstance.patch(`/users/${id}/role`, { role });
export const deactivateUser = (id) => axiosInstance.patch(`/users/${id}/deactivate`);
