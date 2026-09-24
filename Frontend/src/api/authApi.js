import axiosClient from './axiosClient';

export const authApi = {
  login: async (credentials) => {
    // credentials: { email, password }
    const response = await axiosClient.post('/auth/login', credentials);
    return response.data; // { token, user: { id, name, email, role, tenantId, tenant } }
  },

  getMe: async () => {
    const response = await axiosClient.get('/auth/me');
    return response.data; // { user: { id, name, email, role, tenantId, tenant } }
  },

  logout: async () => {
    try {
      const response = await axiosClient.post('/auth/logout');
      return response;
    } catch {
      // Even if network fails, token will be cleared locally
      return null;
    }
  },
};
