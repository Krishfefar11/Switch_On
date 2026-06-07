import axiosInstance from './axiosInstance';

export const getWebhooks   = (projectId)   => axiosInstance.get('/webhooks', { params: { projectId } });
export const createWebhook = (data)        => axiosInstance.post('/webhooks', data);
export const updateWebhook = (id, data)    => axiosInstance.patch(`/webhooks/${id}`, data);
export const deleteWebhook = (id)          => axiosInstance.delete(`/webhooks/${id}`);
export const rotateSecret  = (id)          => axiosInstance.post(`/webhooks/${id}/rotate-secret`);
