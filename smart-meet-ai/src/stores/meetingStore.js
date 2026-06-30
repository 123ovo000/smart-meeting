// src/stores/meetingStore.js
import { defineStore } from 'pinia';
import meetingService from '../services/meetingService';

export const useMeetingStore = defineStore('meeting', {
  state: () => ({
    meetings: [],
    selectedMeeting: null,
    analysisResults: {},
    loading: false,
    uploadProgress: 0,
  }),

  actions: {
    // 获取会议列表
    async fetchMeetings(params = {}) {
      this.loading = true;
      try {
        const response = await meetingService.getMeetings(params);
        this.meetings = response.data || response;
      } catch (error) {
        console.error('获取会议列表失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 获取单个会议
    async fetchMeeting(id) {
      this.loading = true;
      try {
        const response = await meetingService.getMeetingById(id);
        this.selectedMeeting = response;
        return response;
      } catch (error) {
        console.error(`获取会议 ${id} 失败:`, error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 上传会议文件
    async uploadMeeting(file, options = {}) {
      this.loading = true;
      this.uploadProgress = 0;
      
      try {
        const response = await meetingService.uploadMeeting(file, {
          ...options,
          onProgress: (progress) => {
            this.uploadProgress = progress;
            if (options.onProgress) {
              options.onProgress(progress);
            }
          }
        });
        
        // 添加到会议列表
        this.meetings.unshift(response);
        return response;
      } catch (error) {
        console.error('上传会议失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 分析会议
    async analyzeMeeting(meetingId) {
      this.loading = true;
      try {
        const response = await meetingService.analyzeMeeting(meetingId);
        this.analysisResults[meetingId] = response;
        return response;
      } catch (error) {
        console.error(`分析会议 ${meetingId} 失败:`, error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 获取会议分析结果
    async getMeetingAnalysis(meetingId) {
      try {
        const response = await meetingService.getMeetingAnalysis(meetingId);
        this.analysisResults[meetingId] = response;
        return response;
      } catch (error) {
        console.error(`获取会议 ${meetingId} 分析结果失败:`, error);
        throw error;
      }
    },

    // 设置选中的会议
    setSelectedMeeting(meeting) {
      this.selectedMeeting = meeting;
    },

    // 清除选中的会议
    clearSelectedMeeting() {
      this.selectedMeeting = null;
    },
  },

  getters: {
    getMeetingById: (state) => (id) => {
      return state.meetings.find(meeting => meeting.id === id);
    },
    
    getAnalysisByMeetingId: (state) => (meetingId) => {
      return state.analysisResults[meetingId];
    },
    
    isMeetingLoading: (state) => state.loading,
    
    getCurrentUploadProgress: (state) => state.uploadProgress,
  }
});
