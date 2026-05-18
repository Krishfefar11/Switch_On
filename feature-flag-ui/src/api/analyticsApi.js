import axiosInstance from './axiosInstance';

export const getFlagAnalytics = (id, days = 7) =>
  axiosInstance.get(`/analytics/flags/${id}`, { params: { days } });

export const getAnalyticsOverview = (params) =>
  axiosInstance.get('/analytics/overview', { params });
