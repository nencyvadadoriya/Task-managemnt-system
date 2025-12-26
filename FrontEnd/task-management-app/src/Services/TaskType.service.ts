import apiClient from './apiClient';

export type TaskTypeItem = {
  id: string;
  _id?: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const taskTypeService = {
  async getTaskTypes(): Promise<{ success: boolean; data: TaskTypeItem[] }> {
    const response = await apiClient.get('/task-types');
    return response.data;
  },

  async createTaskType(payload: { name: string }): Promise<{ success: boolean; data: TaskTypeItem }> {
    const response = await apiClient.post('/task-types', payload);
    return response.data;
  },

  async bulkUpsertTaskTypes(payload: { types: Array<{ name: string; clientId?: string } | string> }): Promise<{ success: boolean; data: TaskTypeItem[] }> {
    const response = await apiClient.post('/task-types/bulk', payload);
    return response.data;
  },

  async deleteTaskType(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/task-types/${id}`);
    return response.data;
  },
};
