import axiosInstance from './axiosInstance';

export const listInvitations   = ()            => axiosInstance.get('/invitations');
export const createInvitation  = (data)        => axiosInstance.post('/invitations', data);
export const revokeInvitation  = (id)          => axiosInstance.delete(`/invitations/${id}`);
export const verifyInviteToken = (token)       => axiosInstance.get(`/invitations/${token}/verify`);
export const acceptInvite      = (token, data) => axiosInstance.post(`/invitations/${token}/accept`, data);
