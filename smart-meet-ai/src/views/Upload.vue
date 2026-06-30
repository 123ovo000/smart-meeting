<template>
  <div class="upload-container">
    <div class="upload-header">
      <div class="header-icon">
        <i class="fas fa-upload"></i>
      </div>
      <div class="header-content">
        <h2>文件上传</h2>
        <p class="header-desc">将视频或音频文件上传到本地存储</p>
      </div>
    </div>
    
    <div class="file-upload" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">
      <input type="file" @change="handleFileSelect" accept=".mp3,.wav,.m4a,.mp4,.mov,.avi,.mkv" ref="fileInput" style="display: none;" />
      <div class="upload-area" :class="{ 'drag-over': isDragging }" @click="$refs.fileInput.click()">
        <div v-if="!selectedFile" class="upload-empty">
          <div class="upload-icon">
            <i class="fas fa-cloud-upload-alt"></i>
          </div>
          <p class="upload-title">点击选择文件或拖拽文件到这里</p>
          <p class="file-types">支持格式: MP3, WAV, M4A, MP4, MOV, AVI, MKV</p>
        </div>
        <div v-else class="file-selected">
          <div class="selected-icon">
            <i class="fas fa-file-video"></i>
          </div>
          <div class="selected-info">
            <p class="selected-name">{{ selectedFile.name }}</p>
            <p class="file-size">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
          <button class="clear-btn" @click.stop="selectedFile = null">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>

    <div v-if="uploading" class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: uploadPercent + '%' }"></div>
        <div class="progress-glow" :style="{ left: uploadPercent + '%' }"></div>
      </div>
      <div class="progress-info">
        <span class="progress-text">正在保存文件到本地</span>
        <span class="progress-percent">{{ Math.round(uploadPercent) }}%</span>
      </div>
    </div>

    <button @click="uploadFile" :disabled="!selectedFile || uploading" class="upload-btn">
      <i class="fas fa-arrow-up"></i>
      <span>{{ uploading ? '保存中...' : '开始上传' }}</span>
    </button>

    <!-- 上传完成提示 -->
    <div v-if="uploadComplete" class="success-message">
      <div class="success-icon">
        <i class="fas fa-check"></i>
      </div>
      <h3>文件上传成功！</h3>
      <p>文件已成功保存到本地</p>
      <p class="tip">您可以在「全部会议」页面查看已上传的文件</p>
      <router-link to="/meetings" class="go-analysis-btn">
        <i class="fas fa-list"></i>
        查看会议列表
      </router-link>
    </div>

    <div v-if="error" class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { uploadedVideos, currentVideo, saveVideoToIndexedDB } from '../services/videoService';

const router = useRouter();

const selectedFile = ref(null);
const uploading = ref(false);
const uploadPercent = ref(0);
const error = ref(null);
const isDragging = ref(false);
const uploadComplete = ref(false);

const handleFileSelect = (e) => {
  if (e.target.files[0]) {
    selectedFile.value = e.target.files[0];
    error.value = null;
    uploadComplete.value = false;
    uploadPercent.value = 0;
  }
};

// 🎯 只保存文件到本地存储，不进行AI分析
// 将文件转换为base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const uploadFile = async () => {
  if (!selectedFile.value) return;
  
  uploading.value = true;
  error.value = null;
  uploadComplete.value = false;
  uploadPercent.value = 0;

  try {
    // 1. 将视频文件转换为base64（这样刷新页面后也能播放）
    const base64Url = await fileToBase64(selectedFile.value);
    
    // 2. 更新进度
    uploadPercent.value = 30;
    
    // 3. 创建视频对象
    const newVideo = {
      id: Date.now(),
      name: selectedFile.value.name,
      url: base64Url,
      type: selectedFile.value.type || 'video/mp4',
      thumbnail: '',
      uploadDate: new Date().toLocaleDateString('zh-CN'),
      duration: 0,
      size: selectedFile.value.size,
      highlights: [],
      transcript: '',
      taskId: null,
      analysis: null
    };
    
    // 4. 尝试获取视频时长
    try {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = base64Url;
      
      await new Promise((resolve) => {
        tempVideo.onloadedmetadata = () => {
          newVideo.duration = Math.round(tempVideo.duration);
          resolve();
        };
        tempVideo.onerror = () => resolve();
        setTimeout(resolve, 3000);
      });
      tempVideo.remove();
    } catch (e) {
      console.warn('获取视频时长失败:', e);
    }
    
    // 5. 更新进度
    uploadPercent.value = 60;
    
    // 6. 保存到 IndexedDB
    try {
      await saveVideoToIndexedDB(newVideo);
      console.log('视频已保存到 IndexedDB');
    } catch (e) {
      console.warn('保存到 IndexedDB 失败:', e);
    }
    
    // 7. 更新进度
    uploadPercent.value = 80;
    
    // 8. 添加到视频列表
    uploadedVideos.value.push(newVideo);
    currentVideo.value = newVideo;
    
    // 9. 只保存视频元数据到 localStorage（不保存base64视频数据）
    const videoMetadata = uploadedVideos.value.map(v => ({
      id: v.id,
      name: v.name,
      type: v.type,
      thumbnail: v.thumbnail,
      uploadDate: v.uploadDate,
      duration: v.duration,
      size: v.size
    }));
    localStorage.setItem('smartMeetVideoMetadata', JSON.stringify(videoMetadata));
    
    // 10. 更新进度完成
    uploadPercent.value = 100;
    
    // 11. 标记完成
    uploadComplete.value = true;
    
  } catch (err) {
    error.value = err.message || '保存失败';
  } finally {
    uploading.value = false;
  }
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
};

const handleDrop = (e) => {
  isDragging.value = false;
  if (e.dataTransfer.files[0]) selectedFile.value = e.dataTransfer.files[0];
};
</script>

<style scoped>
.upload-container {
  max-width: 500px;
  margin: 3rem auto;
  padding: 0 1.5rem;
}

.upload-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  color: white;
  box-shadow: 0 6px 20px var(--primary-glow);
}

.header-content h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.header-desc {
  font-size: 0.9rem;
  color: var(--text-dim);
  margin: 0.3rem 0 0;
}

.file-upload {
  margin-bottom: 1.5rem;
}

.upload-area {
  border: 2px dashed rgba(255,255,255,0.1);
  padding: 3rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: var(--radius-xl);
  background: var(--bg-card);
  position: relative;
  overflow: hidden;
}

.upload-area::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.05), transparent);
  transition: left 0.6s ease;
}

.upload-area:hover {
  border-color: rgba(139, 92, 246, 0.4);
  background: linear-gradient(135deg, var(--bg-card), rgba(139, 92, 246, 0.03));
}

.upload-area:hover::before {
  left: 100%;
}

.upload-area.drag-over {
  border-color: var(--primary);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.05));
  box-shadow: 0 0 30px var(--primary-glow);
  transform: scale(1.02);
}

.upload-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.upload-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: var(--primary);
  transition: all 0.3s ease;
}

.upload-area:hover .upload-icon {
  transform: scale(1.1);
  box-shadow: 0 8px 25px var(--primary-glow);
}

.upload-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.file-types {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin: 0;
}

.file-selected {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(16, 185, 129, 0.08);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.selected-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--success), rgba(16, 185, 129, 0.7));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  color: white;
}

.selected-info {
  flex: 1;
  text-align: left;
}

.selected-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0.2rem 0 0;
}

.clear-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: var(--danger);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.clear-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  transform: scale(1.1);
}

.progress-container {
  margin: 1.5rem 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255,255,255,0.08);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-glow {
  position: absolute;
  top: 50%;
  width: 20px;
  height: 20px;
  background: var(--primary);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.5;
  filter: blur(8px);
  transition: left 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-top: 0.6rem;
}

.progress-text {
  color: var(--text-muted);
}

.progress-percent {
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--primary);
  font-weight: 600;
}

.upload-btn {
  margin-top: 0.5rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  width: 100%;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.upload-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px var(--primary-glow);
}

.upload-btn:disabled {
  background: rgba(255,255,255,0.1);
  color: var(--text-dim);
  cursor: not-allowed;
}

/* 成功提示 */
.success-message {
  margin-top: 1.5rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
  border-radius: var(--radius-xl);
  text-align: center;
  border: 1px solid rgba(16, 185, 129, 0.2);
  animation: successFadeIn 0.5s ease;
}

@keyframes successFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--success), rgba(16, 185, 129, 0.7));
  color: white;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  box-shadow: 0 6px 20px var(--success-glow);
}

.success-message h3 {
  color: var(--success);
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
  font-weight: 700;
}

.success-message p {
  color: var(--text-muted);
  margin-bottom: 0.3rem;
  font-size: 0.95rem;
}

.success-message .tip {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.go-analysis-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.2rem;
  padding: 0.8rem 1.5rem;
  background: linear-gradient(135deg, var(--success), rgba(16, 185, 129, 0.7));
  color: white;
  text-decoration: none;
  border-radius: var(--radius-lg);
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.go-analysis-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--success-glow);
}

.error-message {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(239, 68, 68, 0.08);
  color: var(--danger);
  border-radius: var(--radius-lg);
  text-align: center;
  border: 1px solid rgba(239, 68, 68, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.error-message i {
  font-size: 1rem;
}

/* 🎯 新增：AI 分析结果样式 */
.processing-status {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.05));
  border-radius: var(--radius-xl);
  text-align: center;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.processing-status .spinner {
  border: 4px solid rgba(139, 92, 246, 0.2);
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.processing-status p {
  color: var(--text-muted);
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.check-btn {
  padding: 0.6rem 1.2rem;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: var(--radius-lg);
  color: var(--primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.check-btn:hover {
  background: rgba(139, 92, 246, 0.25);
  transform: translateY(-2px);
}

.result-container {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
  border-radius: var(--radius-xl);
  border: 1px solid rgba(16, 185, 129, 0.2);
  animation: successFadeIn 0.5s ease;
}

.result-container h3 {
  color: var(--success);
  margin-bottom: 1rem;
  font-size: 1.2rem;
  font-weight: 700;
}

.ai-info-box {
  background: rgba(139, 92, 246, 0.08);
  border-left: 4px solid var(--primary);
  padding: 1rem 1.2rem;
  margin-bottom: 1rem;
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
  text-align: left;
}

.ai-info-box strong {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--primary);
  font-size: 0.95rem;
}

.ai-info-box p {
  color: var(--text-muted);
  line-height: 1.6;
  font-size: 0.9rem;
  white-space: pre-wrap;
}

.download-section {
  margin-bottom: 1rem;
}

.download-btn {
  width: 100%;
  padding: 0.9rem 1.5rem;
  background: linear-gradient(135deg, var(--success), rgba(16, 185, 129, 0.7));
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.download-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--success-glow);
}

.transcript-preview {
  margin-top: 1rem;
}

.transcript-preview h4 {
  color: var(--text-main);
  margin-bottom: 0.8rem;
  font-size: 1rem;
  font-weight: 600;
}

.transcript-preview pre {
  background: rgba(0,0,0,0.25);
  padding: 1rem;
  border-radius: var(--radius-lg);
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-muted);
  border: 1px solid rgba(255,255,255,0.05);
}
</style>