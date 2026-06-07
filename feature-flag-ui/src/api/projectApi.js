import axiosInstance from './axiosInstance';

export const getProjects    = ()       => axiosInstance.get('/projects');
export const createProject  = (data)   => axiosInstance.post('/projects', data);
export const updateProject  = (id, d)  => axiosInstance.patch(`/projects/${id}`, d);
export const deleteProject  = (id)     => axiosInstance.delete(`/projects/${id}`);
export const getSdkKeys     = (id)     => axiosInstance.get(`/projects/${id}/sdk-keys`);
export const createSdkKey   = (id, d)  => axiosInstance.post(`/projects/${id}/sdk-keys`, d);
export const revokeSdkKey   = (pid, kid) => axiosInstance.delete(`/projects/${pid}/sdk-keys/${kid}`);
