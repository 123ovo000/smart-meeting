// src/services/meetingService.js
import apiClient from './api';

const meetingService = {
  // 获取会议列表
  getMeetings: async (params = {}) => {
    try {
      const response = await apiClient.get('/meetings', { params });
      return response.data;
    } catch (error) {
      throw new Error(`获取会议列表失败: ${error.message}`);
    }
  },

  // 获取单个会议详情
  getMeetingById: async (id) => {
    try {
      const response = await apiClient.get(`/meetings/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`获取会议详情失败: ${error.message}`);
    }
  },

  // 上传会议文件
  uploadMeeting: async (file, options = {}) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // 如果有额外选项，也添加到formData
      Object.keys(options).forEach(key => {
        formData.append(key, options[key]);
      });

      const response = await apiClient.post('/meetings/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (options.onProgress) {
            options.onProgress(progress);
          }
        },
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`上传会议文件失败: ${error.message}`);
    }
  },

  // 分析会议内容
  analyzeMeeting: async (meetingId) => {
    try {
      const response = await apiClient.post(`/meetings/${meetingId}/analyze`);
      return response.data;
    } catch (error) {
      throw new Error(`分析会议内容失败: ${error.message}`);
    }
  },

  // 获取会议分析结果
  getMeetingAnalysis: async (meetingId) => {
    try {
      const response = await apiClient.get(`/meetings/${meetingId}/analysis`);
      return response.data;
    } catch (error) {
      throw new Error(`获取会议分析结果失败: ${error.message}`);
    }
  },

  // 获取推荐会议
  getRecommendedMeetings: async () => {
    try {
      const response = await apiClient.get('/meetings/recommended');
      return response.data;
    } catch (error) {
      throw new Error(`获取推荐会议失败: ${error.message}`);
    }
  },

  // 获取会议统计数据
  getMeetingStats: async () => {
    try {
      const response = await apiClient.get('/meetings/stats');
      return response.data;
    } catch (error) {
      throw new Error(`获取会议统计数据失败: ${error.message}`);
    }
  },
};

export default meetingService;
