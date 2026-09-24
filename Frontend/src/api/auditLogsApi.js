import axiosClient from './axiosClient';

export const auditLogsApi = {
  getAuditLogs: async (params = {}) => {
    // params: { page, limit, action, actorId, startDate, endDate }
    const response = await axiosClient.get('/audit-logs', { params });
    return response;
  },
};
