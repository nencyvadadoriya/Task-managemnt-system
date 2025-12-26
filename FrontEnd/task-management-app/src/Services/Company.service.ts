import apiClient from './apiClient';

export type Company = {
  id: string;
  _id?: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const companyService = {
  async getCompanies(): Promise<{ success: boolean; data: Company[] }> {
    const response = await apiClient.get('/companies');
    return response.data;
  },

  async createCompany(payload: { name: string }): Promise<{ success: boolean; data: Company }> {
    const response = await apiClient.post('/companies', payload);
    return response.data;
  },

  async bulkUpsertCompanies(payload: { companies: Array<{ name: string; clientId?: string } | string> }): Promise<{ success: boolean; data: Company[] }> {
    const response = await apiClient.post('/companies/bulk', payload);
    return response.data;
  },

  async deleteCompany(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/companies/${id}`);
    return response.data;
  },
};
