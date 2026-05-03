import axiosInstance from './axiosInstance';

export const login = (email, password) => axiosInstance.post('/auth/login', { email, password });
export const register = (email, password) => axiosInstance.post('/auth/register', { email, password });
export const logout = () => axiosInstance.post('/auth/logout');
export const refresh = () => axiosInstance.post('/auth/refresh');
export const getMe = () => axiosInstance.get('/auth/me');
