// src/services/api.js
import axios from 'axios';
import apiConfig from '../config/api';

// 创建axios实例
const apiClient = axios.create(apiConfig);

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token（如果有）
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 处理错误响应
    if (error.response?.status === 401) {
      // 认证失败，清除token并重定向到登录页
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
