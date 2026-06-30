// src/services/starredService.js
import apiClient from './api';

const starredService = {
  // 获取收藏的会议片段
  getStarredItems: async (params = {}) => {
    try {
      const response = await apiClient.get('/starred', { params });
      return response.data;
    } catch (error) {
      throw new Error(`获取收藏片段失败: ${error.message}`);
    }
  },

  // 添加到收藏
  addToStarred: async (data) => {
    try {
      const response = await apiClient.post('/starred', data);
      return response.data;
    } catch (error) {
      throw new Error(`添加收藏失败: ${error.message}`);
    }
  },

  // 从收藏中移除
  removeFromStarred: async (itemId) => {
    try {
      const response = await apiClient.delete(`/starred/${itemId}`);
      return response.data;
    } catch (error) {
      throw new Error(`取消收藏失败: ${error.message}`);
    }
  },
};

export default starredService;
