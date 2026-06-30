<template>
  <div class="view-section">
    <div class="starred-header">
      <h1 class="starred-title">星标片段</h1>
      <p class="starred-subtitle">查看和管理您标记的重要会议片段</p>
    </div>
    
    <div class="starred-controls">
      <div class="search-bar">
        <i class="fas fa-search"></i>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索星标片段..."
        >
      </div>
      <div class="filter-controls">
        <select v-model="filterOption">
          <option value="all">全部</option>
          <option value="video">视频片段</option>
          <option value="note">会议笔记</option>
        </select>
      </div>
    </div>
    
    <div class="starred-list" v-if="filteredStarredItems.length > 0">
      <div 
        class="starred-item" 
        v-for="(item, index) in filteredStarredItems" 
        :key="index"
      >
        <div class="item-thumbnail" v-if="item.type === 'video'">
          <!-- 视频缩略图 -->
          <video 
            ref="(el) => videoElements[item.id] = el"
            :src="getVideoUrl(item.meetingId)"
            class="thumbnail-video"
            muted
            @loadeddata="generateThumbnail(item)"
          ></video>
          <canvas 
            :ref="(el) => thumbnailCanvases[item.id] = el"
            class="thumbnail-canvas"
          ></canvas>
          <button class="play-button" @click="playStarredItem(item)">
            <i class="fas fa-play"></i>
          </button>
          <span class="time-badge">{{ item.time }}</span>
        </div>
        <div class="item-thumbnail note-thumbnail" v-else>
          <i class="fas fa-sticky-note"></i>
        </div>
        <div class="item-content">
          <div class="item-header">
            <h3 class="item-title">{{ item.title }}</h3>
            <div class="item-actions">
              <button class="action-btn edit-btn" @click="editStarredItem(item)">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn delete-btn" @click="deleteStarredItem(index)">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="item-meta">
            <span class="meta-item">
              <i class="fas fa-calendar"></i> {{ item.date }}
            </span>
            <span class="meta-item" v-if="item.meetingName">
              <i class="fas fa-video"></i> {{ item.meetingName }}
            </span>
            <span class="meta-item" v-if="item.speaker">
              <i class="fas fa-user"></i> {{ item.speaker }}
            </span>
          </div>
          <div class="item-description">
            <p>{{ item.description }}</p>
          </div>
          <div class="item-tags" v-if="item.tags && item.tags.length > 0">
            <span class="tag" v-for="(tag, tagIndex) in item.tags" :key="tagIndex">
              {{ tag }}
            </span>
          </div>
          <div class="item-actions-bottom">
            <button class="btn primary-btn" @click="playStarredItem(item)" v-if="item.type === 'video'">
              <i class="fas fa-play"></i> 播放片段
            </button>
            <button class="btn secondary-btn" @click="viewMeeting(item)" v-if="item.meetingId">
              <i class="fas fa-video"></i> 查看完整会议
            </button>
            <button class="btn outline-btn" @click="exportStarredItem(item)">
              <i class="fas fa-export"></i> 导出
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="empty-state" v-else>
      <i class="fas fa-bookmark"></i>
      <h3>暂无星标片段</h3>
      <p>您还没有标记任何重要的会议片段</p>
      <router-link to="/dashboard" class="browse-btn">
        <i class="fas fa-compass"></i> 浏览会议
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { uploadedVideos, currentVideo, loadVideos } from '../services/videoService'

const router = useRouter()

// 响应式数据
const searchQuery = ref('')
const filterOption = ref('all')
const starredItems = ref([])

// 存储视频元素和画布元素的引用
const videoElements = ref({})
const thumbnailCanvases = ref({})

// 过滤星标片段
const filteredStarredItems = computed(() => {
  let items = [...starredItems.value]
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      (item.meetingName && item.meetingName.toLowerCase().includes(query))
    )
  }
  
  // 类型过滤
  if (filterOption.value !== 'all') {
    items = items.filter(item => item.type === filterOption.value)
  }
  
  // 按添加时间排序
  return items.sort((a, b) => {
    return new Date(b.date) - new Date(a.date)
  })
})

// 获取视频URL
const getVideoUrl = (meetingId) => {
  const meeting = uploadedVideos.value.find(video => video.id === meetingId)
  return meeting ? meeting.url : ''
}

// 生成视频缩略图
const generateThumbnail = (item) => {
  const videoElement = videoElements.value[item.id]
  const canvas = thumbnailCanvases.value[item.id]
  
  if (videoElement && canvas) {
    try {
      // 设置画布大小
      canvas.width = 480
      canvas.height = 270
      
      // 确保视频已经加载了一些数据
      if (videoElement.readyState >= 2) {
        // 如果有时间戳，跳转到指定时间
        if (item.timestamp) {
          videoElement.currentTime = item.timestamp
        }
        
        // 绘制视频帧到画布
        const ctx = canvas.getContext('2d')
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
        
        // 停止视频播放
        videoElement.pause()
      }
    } catch (error) {
      console.error('生成缩略图失败:', error)
    }
  }
}

// 播放星标片段
const playStarredItem = (item) => {
  if (item.type === 'video' && item.meetingId) {
    // 找到对应的会议视频
    const meeting = uploadedVideos.value.find(video => video.id === item.meetingId)
    if (meeting) {
      currentVideo.value = meeting
      // 跳转到仪表板页面并传递时间戳
      router.push({
        path: '/dashboard',
        query: { timestamp: item.timestamp || 0 }
      })
    }
  }
}

// 编辑星标片段
const editStarredItem = (item) => {
  // 简单的编辑对话框
  const newTitle = prompt('请输入新的标题:', item.title)
  const newDescription = prompt('请输入新的描述:', item.description)
  
  if (newTitle) {
    item.title = newTitle
  }
  if (newDescription) {
    item.description = newDescription
  }
  
  saveStarredItems()
  alert('星标片段已更新')
}

// 删除星标片段
const deleteStarredItem = (index) => {
  const item = starredItems.value[index]
  if (confirm(`确定要删除星标片段 "${item.title}" 吗？`)) {
    starredItems.value.splice(index, 1)
    saveStarredItems()
  }
}

// 查看完整会议
const viewMeeting = (item) => {
  if (item.meetingId) {
    const meeting = uploadedVideos.value.find(video => video.id === item.meetingId)
    if (meeting) {
      currentVideo.value = meeting
      router.push('/meetings')
    }
  }
}

// 导出星标片段
const exportStarredItem = (item) => {
  const content = JSON.stringify(item, null, 2)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${item.title.replace(/\s+/g, '_')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 保存星标片段到本地存储
const saveStarredItems = () => {
  localStorage.setItem('smartMeetStarredItems', JSON.stringify(starredItems.value))
}

// 加载星标片段
const loadStarredItems = () => {
  const items = JSON.parse(localStorage.getItem('smartMeetStarredItems') || '[]')
  starredItems.value = items
}

// 生成模拟数据
const generateMockData = () => {
  const mockItems = [
    {
      id: 1,
      type: 'video',
      title: '缓存层前置技术方案',
      description: '李技术总监提出的缓存层前置技术方案，解决并发瓶颈问题',
      time: '14:22',
      timestamp: 862, // 转换为秒
      date: '2026-04-15',
      meetingId: 1,
      meetingName: '2023 Q4 产品路线图规划',
      speaker: '李技术总监',
      tags: ['技术方案', '决策点']
    },
    {
      id: 2,
      type: 'note',
      title: '用户增长数据',
      description: '上月用户增长数据环比上升15%，超额完成目标',
      date: '2026-04-14',
      meetingId: 2,
      meetingName: '核心架构微服务改造技术宣讲',
      speaker: '张经理',
      tags: ['数据汇报', '成果']
    },
    {
      id: 3,
      type: 'video',
      title: '新版本发布日期确定',
      description: '确定新版本发布日期为下月15号，UI组需提前一周交付切图',
      time: '35:10',
      timestamp: 2110, // 转换为秒
      date: '2026-04-13',
      meetingId: 3,
      meetingName: '市场部品牌重塑紧急会议',
      speaker: '产品经理',
      tags: ['待办事项', '截止日期']
    }
  ]
  starredItems.value = mockItems
  saveStarredItems()
}

// 生命周期钩子
onMounted(() => {
  loadVideos()
  loadStarredItems()
  
  // 如果没有星标片段，生成模拟数据
  if (starredItems.value.length === 0) {
    generateMockData()
  }
})
</script>

<style scoped>
.view-section {
  padding: 1.5rem 2rem;
  height: 100%;
  overflow-y: auto;
}

.starred-header {
  margin-bottom: 2rem;
  text-align: center;
}

.starred-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: var(--text-main);
}

.starred-subtitle {
  font-size: 1rem;
  color: var(--text-muted);
}

.starred-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.search-bar {
  flex: 1;
  min-width: 300px;
  background: var(--bg-card);
  border-radius: 8px;
  padding: 0.8rem 1rem;
  display: flex;
  align-items: center;
  border: 1px solid rgba(255,255,255,0.05);
}

.search-bar i {
  color: var(--text-muted);
  margin-right: 0.8rem;
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
  color: var(--text-muted);
}

.filter-controls {
  min-width: 200px;
}

.filter-controls select {
  width: 100%;
  background: var(--bg-card);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 0.8rem 1rem;
  color: var(--text-main);
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
}

.filter-controls select option {
  background: var(--bg-sidebar);
  color: var(--text-main);
}

.starred-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.starred-item {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.starred-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.4);
  border-color: rgba(99, 102, 241, 0.3);
}

.item-thumbnail {
  height: 180px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  background: #1e1e24;
}

.thumbnail-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  pointer-events: none;
}

.thumbnail-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.note-thumbnail {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  font-size: 3rem;
}

.play-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.9);
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
}

.item-thumbnail:hover .play-button {
  opacity: 1;
  transform: scale(1.1);
}

.time-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0,0,0,0.8);
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: monospace;
  color: white;
}

.item-content {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.item-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
  flex: 1;
  margin-right: 1rem;
  line-height: 1.4;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: rgba(255,255,255,0.1);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: rgba(255,255,255,0.2);
  color: var(--text-main);
}

.edit-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  color: var(--primary);
}

.delete-btn:hover {
  background: rgba(255, 71, 87, 0.2);
  color: var(--danger);
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.item-description {
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--text-main);
  line-height: 1.4;
  flex: 1;
}

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tag {
  font-size: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.item-actions-bottom {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.primary-btn {
  background: var(--primary);
  color: white;
}

.primary-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.secondary-btn {
  background: rgba(99, 102, 241, 0.2);
  color: var(--primary);
  border: 1px solid var(--primary);
}

.secondary-btn:hover {
  background: var(--primary);
  color: white;
  transform: translateY(-1px);
}

.outline-btn {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid rgba(255,255,255,0.2);
}

.outline-btn:hover {
  background: rgba(255,255,255,0.1);
  color: var(--text-main);
  transform: translateY(-1px);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  text-align: center;
  color: var(--text-muted);
}

.empty-state i {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  color: var(--primary);
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: var(--text-main);
}

.empty-state p {
  font-size: 1rem;
  margin-bottom: 2rem;
}

.browse-btn {
  background: var(--primary);
  color: white;
  padding: 0.8rem 2rem;
  border-radius: 8px;
  text-decoration: none;
  font-size: 1rem;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.browse-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .view-section {
    padding: 1rem;
  }
  
  .starred-controls {
    flex-direction: column;
  }
  
  .search-bar {
    min-width: 100%;
  }
  
  .filter-controls {
    min-width: 100%;
  }
  
  .starred-list {
    grid-template-columns: 1fr;
  }
  
  .item-actions-bottom {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>