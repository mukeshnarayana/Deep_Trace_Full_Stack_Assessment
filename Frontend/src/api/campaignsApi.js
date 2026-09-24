import axiosClient from './axiosClient';

export const campaignsApi = {
  getCampaigns: async (params = {}) => {
    // params: { page, limit, search, status, sortBy, sortOrder }
    const response = await axiosClient.get('/campaigns', { params });
    // sendPaginated returns { success, data, page, limit, total, totalPages }
    return response;
  },

  getCampaignById: async (id) => {
    const response = await axiosClient.get(`/campaigns/${id}`);
    return response.data;
  },

  createCampaign: async (payload) => {
    // Only send allowed fields: name, description, status, startDate, endDate, assignedUsers
    const cleanPayload = {
      name: payload.name,
      description: payload.description,
      status: payload.status,
      startDate: payload.startDate,
      endDate: payload.endDate,
      assignedUsers: payload.assignedUsers || [],
    };
    const response = await axiosClient.post('/campaigns', cleanPayload);
    return response.data;
  },

  updateCampaign: async (id, payload) => {
    const cleanPayload = {};
    if (payload.name !== undefined) cleanPayload.name = payload.name;
    if (payload.description !== undefined) cleanPayload.description = payload.description;
    if (payload.status !== undefined) cleanPayload.status = payload.status;
    if (payload.startDate !== undefined) cleanPayload.startDate = payload.startDate;
    if (payload.endDate !== undefined) cleanPayload.endDate = payload.endDate;
    if (payload.assignedUsers !== undefined) cleanPayload.assignedUsers = payload.assignedUsers;

    const response = await axiosClient.patch(`/campaigns/${id}`, cleanPayload);
    return response.data;
  },

  deleteCampaign: async (id) => {
    const response = await axiosClient.delete(`/campaigns/${id}`);
    return response;
  },

  assignUser: async (campaignId, userId) => {
    const response = await axiosClient.post(`/campaigns/${campaignId}/users`, { userId });
    return response.data;
  },

  removeUser: async (campaignId, userId) => {
    const response = await axiosClient.delete(`/campaigns/${campaignId}/users/${userId}`);
    return response.data;
  },
};
