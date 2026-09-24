import axiosClient from './axiosClient';

export const usersApi = {
  getUsers: async (params = {}) => {
    // params: { page, limit, search }
    const response = await axiosClient.get('/users', { params });
    return response;
  },

  createUser: async (userData) => {
    // Only send name, email, password, role. NEVER tenantId!
    const cleanPayload = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'USER',
    };
    const response = await axiosClient.post('/users', cleanPayload);
    return response.data;
  },

  updateUser: async (id, updates) => {
    // Only send name, role, isActive. NEVER tenantId!
    const cleanPayload = {};
    if (updates.name !== undefined) cleanPayload.name = updates.name;
    if (updates.role !== undefined) cleanPayload.role = updates.role;
    if (updates.isActive !== undefined) cleanPayload.isActive = updates.isActive;

    const response = await axiosClient.patch(`/users/${id}`, cleanPayload);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await axiosClient.delete(`/users/${id}`);
    return response;
  },
};
