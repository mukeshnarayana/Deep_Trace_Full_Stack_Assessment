import axiosClient from './axiosClient';

export const dashboardApi = {
  getDashboardStats: async () => {
    const response = await axiosClient.get('/dashboard');
    return response.data; // { tenantId, metrics: { usersCount, campaignsByStatus, openEventsCount, criticalEventsCount }, recentAuditLogs }
  },
};
