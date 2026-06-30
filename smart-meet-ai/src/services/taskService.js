// src/services/taskService.js
import apiClient from './api';

const taskService = {
  // 获取任务列表
  getTasks: async (params = {}) => {
    try {
      const response = await apiClient.get('/tasks', { params });
      return response.data;
    } catch (error) {
      throw new Error(`获取任务列表失败: ${error.message}`);
    }
  },

  // 更新任务状态
  updateTask: async (taskId, updates) => {
    try {
      const response = await apiClient.put(`/tasks/${taskId}`, updates);
      return response.data;
    } catch (error) {
      throw new Error(`更新任务失败: ${error.message}`);
    }
  },

  // 创建新任务
  createTask: async (taskData) => {
    try {
      const response = await apiClient.post('/tasks', taskData);
      return response.data;
    } catch (error) {
      throw new Error(`创建任务失败: ${error.message}`);
    }
  },

  // 删除任务
  deleteTask: async (taskId) => {
    try {
      const response = await apiClient.delete(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      throw new Error(`删除任务失败: ${error.message}`);
    }
  },
};

export default taskService;
