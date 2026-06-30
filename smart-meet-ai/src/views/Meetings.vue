<template>
  <div class="view-section">
    <div class="meetings-header">
      <h1 class="meetings-title">全部会议</h1>
      <p class="meetings-subtitle">查看和管理所有上传的会议视频</p>
    </div>
    
    <div class="meetings-controls">
      <div class="search-bar">
        <i class="fas fa-search"></i>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索会议名称..."
        >
      </div>
      <div class="filter-controls">
        <select v-model="filterOption">
          <option value="all">全部</option>
          <option value="analyzed">已分析</option>
          <option value="unanalyzed">未分析</option>
        </select>
      </div>
    </div>
    
    <div class="meetings-list" v-if="filteredVideos.length > 0">
      <div 
        class="meeting-card" 
        v-for="(video, index) in filteredVideos" 
        :key="index"
      >
        <div class="card-thumbnail" :style="{ background: getThumbnailBackground(video) }">
          <button class="play-button" @click="playVideo(video)">
            <i class="fas fa-play"></i>
          </button>
          <span class="time-badge">{{ formatDuration(video.duration || 0) }}</span>
          <span class="status-badge" :class="video.analysis ? 'analyzed' : 'unanalyzed'">
            {{ video.analysis ? '已分析' : '未分析' }}
          </span>
        </div>
        <div class="card-content">
          <div class="card-header">
            <h3 class="card-title">{{ video.name }}</h3>
            <div class="card-actions">
              <button class="action-btn edit-btn" @click="editVideo(video)">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn delete-btn" @click="deleteVideo(video)">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="card-meta">
            <span class="meta-item">
              <i class="fas fa-calendar"></i> {{ video.uploadDate }}
            </span>
            <span class="meta-item">
              <i class="fas fa-file"></i> {{ formatFileSize(video.size) }}
            </span>
            <span class="meta-item" v-if="video.analysis">
              <i class="fas fa-users"></i> {{ video.analysis.speakers.length }} 人发言
            </span>
          </div>
          <div class="card-description" v-if="video.analysis">
            <p>{{ getAnalysisSummary(video.analysis) }}</p>
          </div>
          <div class="card-actions-bottom">
            <button class="btn primary-btn" @click="viewAnalysis(video)" v-if="video.analysis">
              <i class="fas fa-chart-line"></i> 查看分析
            </button>
            <button class="btn secondary-btn" @click="analyzeVideo(video)" v-else>
              <i class="fas fa-robot"></i> 分析视频
            </button>
            <button class="btn outline-btn" @click="downloadVideo(video)">
              <i class="fas fa-download"></i> 下载
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="empty-state" v-else>
      <i class="fas fa-video"></i>
      <h3>暂无会议视频</h3>
      <p>请上传会议录像或音频文件</p>
      <router-link to="/upload" class="upload-btn">
        <i class="fas fa-upload"></i> 上传视频
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { uploadedVideos, currentVideo, loadVideos } from '../services/videoService'

const router = useRouter()

// 响应式数据
const searchQuery = ref('')
const filterOption = ref('all')

// 过滤视频
const filteredVideos = computed(() => {
  let videos = [...uploadedVideos.value]
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    videos = videos.filter(video => 
      video.name.toLowerCase().includes(query)
    )
  }
  
  // 状态过滤
  if (filterOption.value === 'analyzed') {
    videos = videos.filter(video => video.analysis)
  } else if (filterOption.value === 'unanalyzed') {
    videos = videos.filter(video => !video.analysis)
  }
  
  // 按上传时间排序
  return videos.sort((a, b) => {
    return new Date(b.uploadDate) - new Date(a.uploadDate)
  })
})

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化时长
const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 获取缩略图背景
const getThumbnailBackground = (video) => {
  const gradients = [
    'linear-gradient(45deg, #2c3e50, #3498db)',
    'linear-gradient(45deg, #1e3c72, #2a5298)',
    'linear-gradient(45deg, #ff9966, #ff5e62)',
    'linear-gradient(45deg, #4CA1AF, #C4E0F3)',
    'linear-gradient(45deg, #667eea, #764ba2)'
  ]
  return gradients[video.id % gradients.length]
}

// 获取分析摘要
const getAnalysisSummary = (analysis) => {
  if (!analysis) return ''
  return `会议时长 ${formatDuration(analysis.duration)}，${analysis.speakers.length} 人发言，${analysis.actionItems.length} 个待办事项`
}

// 播放视频
const playVideo = (video) => {
  currentVideo.value = video
  router.push('/dashboard')
}

// 编辑视频
const editVideo = (video) => {
  console.log('编辑视频:', video)
  // 这里可以添加编辑视频信息的逻辑
}

// 删除视频
const deleteVideo = (video) => {
  if (confirm(`确定要删除视频 "${video.name}" 吗？`)) {
    // 找到视频在原始数组中的索引
    const index = uploadedVideos.value.findIndex(v => v.id === video.id)
    if (index !== -1) {
      uploadedVideos.value.splice(index, 1)
      // 同步更新到本地存储
      saveVideosToStorage()
    }
  }
}

// 保存视频到本地存储
const saveVideosToStorage = () => {
  // 只保存视频元数据到localStorage（避免存储超限）
  const videoMetadata = uploadedVideos.value.map(v => ({
    id: v.id,
    name: v.name,
    type: v.type,
    thumbnail: v.thumbnail,
    uploadDate: v.uploadDate,
    duration: v.duration,
    size: v.size
  }));
  localStorage.setItem('smartMeetVideoMetadata', JSON.stringify(videoMetadata))
  
  // 保存完整视频数据到IndexedDB
  try {
    initIndexedDB().then(db => {
      const transaction = db.transaction('videos', 'readwrite')
      const store = transaction.objectStore('videos')
      // 先清空再重新添加
      store.clear()
      uploadedVideos.value.forEach(video => store.add(video))
    })
  } catch (e) {
    console.warn('保存到IndexedDB失败:', e)
  }
}

// 初始化IndexedDB
const initIndexedDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SmartMeetAI', 1)
        request.onerror = () => reject()
        request.onsuccess = () => resolve(request.result)
        request.onupgradeneeded = (event) => {
            const db = event.target.result
            if (!db.objectStoreNames.contains('videos')) {
                db.createObjectStore('videos', { keyPath: 'id', autoIncrement: true })
            }
        }
    })
}

// 查看分析
const viewAnalysis = (video) => {
  currentVideo.value = video
  router.push('/upload')
}

// 分析视频 - 跳转到数据分析页面
const analyzeVideo = (video) => {
  currentVideo.value = video
  router.push('/analysis')
}

// 下载视频
const downloadVideo = (video) => {
  const link = document.createElement('a')
  link.href = video.url
  link.download = video.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 生命周期钩子
onMounted(() => {
  loadVideos()
})
</script>

<style scoped>
.view-section {
  padding: 1.5rem;
  height: 100%;
  overflow-y: auto;
}

.meetings-header {
  margin-bottom: 2.5rem;
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.03));
  border-radius: var(--radius-xl);
  border: 1px solid rgba(139, 92, 246, 0.1);
}

.meetings-title {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, var(--text-main), var(--text-muted));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.meetings-subtitle {
  font-size: 1rem;
  color: var(--text-dim);
}

.meetings-controls {
  display: flex;
  gap: 1.2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-bar {
  flex: 1;
  min-width: 280px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 0.8rem 1.2rem;
  display: flex;
  align-items: center;
  border: 1px solid rgba(255,255,255,0.06);
  transition: all 0.3s ease;
  position: relative;
}

.search-bar:hover {
  border-color: rgba(139, 92, 246, 0.3);
}

.search-bar:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 20px var(--primary-glow);
}

.search-bar i {
  color: var(--text-dim);
  margin-right: 0.8rem;
  font-size: 0.9rem;
}

.search-bar input {
  background: transparent;
  border: none;
  color: var(--text-main);
  outline: none;
  flex: 1;
  font-size: 0.9rem;
}

.search-bar input::placeholder {
  color: var(--text-dim);
}

.filter-controls {
  min-width: 180px;
}

.filter-controls select {
  width: 100%;
  background: var(--bg-card);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-lg);
  padding: 0.8rem 1.2rem;
  color: var(--text-main);
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-controls select:hover {
  border-color: rgba(139, 92, 246, 0.3);
}

.filter-controls select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 15px var(--primary-glow);
}

.filter-controls select option {
  background: var(--bg-sidebar);
  color: var(--text-main);
}

.meetings-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

.meeting-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.meeting-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.meeting-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.5), 0 0 30px rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
}

.meeting-card:hover::before {
  opacity: 1;
}

.card-thumbnail {
  height: 180px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}

.card-thumbnail::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.card-thumbnail:hover::after {
  opacity: 1;
}

.play-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  box-shadow: 0 4px 16px var(--primary-glow);
  z-index: 2;
}

.card-thumbnail:hover .play-button {
  opacity: 1;
  transform: scale(1.15);
  box-shadow: 0 8px 25px var(--primary-glow);
}

.time-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0,0,0,0.85);
  padding: 0.3rem 0.8rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: white;
  backdrop-filter: blur(4px);
  z-index: 2;
}

.status-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 0.3rem 0.7rem;
  border-radius: 14px;
  font-size: 0.68rem;
  font-weight: 600;
  z-index: 2;
}

.status-badge.analyzed {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-badge.unanalyzed {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.card-content {
  padding: 1.4rem 1.5rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-main);
  flex: 1;
  margin-right: 1rem;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.meeting-card:hover .card-title {
  color: var(--primary);
}

.card-actions {
  display: flex;
  gap: 0.4rem;
}

.action-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255,255,255,0.08);
  background: var(--bg-input);
  color: var(--text-dim);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: rgba(255,255,255,0.1);
  color: var(--text-main);
}

.edit-btn:hover {
  background: rgba(139, 92, 246, 0.15);
  color: var(--primary);
  border-color: rgba(139, 92, 246, 0.3);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
  font-size: 0.82rem;
  color: var(--text-dim);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  background: rgba(255,255,255,0.04);
  border-radius: 6px;
}

.card-description {
  margin-bottom: 1.4rem;
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
  padding: 0.8rem;
  background: rgba(255,255,255,0.03);
  border-radius: var(--radius-md);
}

.card-actions-bottom {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.6rem 1.1rem;
  border-radius: var(--radius-md);
  border: none;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.primary-btn {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--primary-glow);
}

.secondary-btn {
  background: rgba(139, 92, 246, 0.12);
  color: var(--primary);
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.secondary-btn:hover {
  background: var(--primary);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--primary-glow);
}

.outline-btn {
  background: transparent;
  color: var(--text-dim);
  border: 1px solid rgba(255,255,255,0.1);
}

.outline-btn:hover {
  background: rgba(255,255,255,0.08);
  color: var(--text-main);
  border-color: rgba(255,255,255,0.2);
  transform: translateY(-2px);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  text-align: center;
  color: var(--text-muted);
  padding: 2rem;
}

.empty-state i {
  font-size: 5rem;
  margin-bottom: 1.5rem;
  color: var(--primary);
  opacity: 0.4;
  animation: iconFloat 3s ease-in-out infinite;
}

@keyframes iconFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.empty-state h3 {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--text-main);
}

.empty-state p {
  font-size: 1rem;
  margin-bottom: 2rem;
  color: var(--text-dim);
}

.upload-btn {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
  padding: 0.9rem 2rem;
  border-radius: var(--radius-lg);
  text-decoration: none;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 16px var(--primary-glow);
}

.upload-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px var(--primary-glow);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .view-section {
    padding: 1rem;
  }
  
  .meetings-controls {
    flex-direction: column;
  }
  
  .search-bar {
    min-width: 100%;
  }
  
  .filter-controls {
    min-width: 100%;
  }
  
  .meetings-list {
    grid-template-columns: 1fr;
  }
  
  .card-actions-bottom {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>