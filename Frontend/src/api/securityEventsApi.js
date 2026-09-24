import axiosClient from './axiosClient';

export const securityEventsApi = {
  getSecurityEvents: async (params = {}) => {
    // params: { page, limit, severity, status, startDate, endDate, sortBy, sortOrder }
    const response = await axiosClient.get('/security-events', { params });
    return response;
  },

  getSecurityEventById: async (id) => {
    const response = await axiosClient.get(`/security-events/${id}`);
    return response.data;
  },

  createSecurityEvent: async (payload) => {
    const cleanPayload = {
      type: payload.type,
      severity: payload.severity,
      status: payload.status || 'OPEN',
      description: payload.description,
      ...(payload.timestamp ? { timestamp: payload.timestamp } : {}),
    };
    const response = await axiosClient.post('/security-events', cleanPayload);
    return response.data;
  },

  updateSecurityEvent: async (id, payload) => {
    const cleanPayload = {};
    if (payload.status !== undefined) cleanPayload.status = payload.status;
    if (payload.severity !== undefined) cleanPayload.severity = payload.severity;
    if (payload.description !== undefined) cleanPayload.description = payload.description;

    const response = await axiosClient.patch(`/security-events/${id}`, cleanPayload);
    return response.data;
  },
};
