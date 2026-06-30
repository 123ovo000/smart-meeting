<template>
  <div class="recommended-wrapper">
    <h2 class="bottom-grid-title">已上传视频</h2>
    
    <div class="video-grid">
      <div 
        class="grid-card" 
        v-for="(video, index) in videos" 
        :key="index"
        @click="$emit('select-video', video)"
      >
        <div class="card-thumbnail">
          <!-- 备用背景，当视频封面生成失败时显示 -->
          <div class="thumbnail-background" :style="{ background: getThumbnailBackground(video) }"></div>
          
          <video 
            ref="(el) => videoElements[video.id] = el"
            :src="video.url"
            class="thumbnail-video"
            muted
            crossorigin="anonymous"
            @loadeddata="generateThumbnail(video)"
            @error="handleVideoError(video)"
          ></video>
          
          <canvas 
            :ref="(el) => thumbnailCanvases[video.id] = el"
            class="thumbnail-canvas"
          ></canvas>
          
          <div class="play-overlay">
            <i class="fas fa-play-circle"></i>
          </div>
          
          <span class="time-badge">{{ formatDuration(video.duration || 0) }}</span>
        </div>
        <div class="card-info">
          <div class="card-title">{{ video.name }}</div>
          <div class="card-meta">
            <span>{{ formatFileSize(video.size) }}</span>
            <span>{{ video.uploadDate }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  videos: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select-video'])

// 存储视频元素和画布元素的引用
const videoElements = ref({})
const thumbnailCanvases = ref({})

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

// 获取缩略图背景（备用）
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

// 生成视频缩略图
const generateThumbnail = (video) => {
  const videoElement = videoElements.value[video.id]
  const canvas = thumbnailCanvases.value[video.id]
  
  if (videoElement && canvas) {
    try {
      // 设置画布大小
      canvas.width = 320
      canvas.height = 180
      
      // 确保视频已经加载了一些数据
      if (videoElement.readyState >= 2) {
        // 绘制视频第一帧到画布
        const ctx = canvas.getContext('2d')
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
        
        // 停止视频播放
        videoElement.pause()
      } else {
        console.log('视频未完全加载，无法生成缩略图:', video.name)
      }
    } catch (error) {
      console.error('生成缩略图失败:', error)
    }
  }
}

// 处理视频加载错误
const handleVideoError = (video) => {
  console.error('视频加载失败:', video.name)
  // 可以在这里添加错误处理逻辑
}

// 监听视频列表变化，重新生成缩略图
watch(() => props.videos, (newVideos) => {
  // 延迟执行，确保DOM已更新
  setTimeout(() => {
    newVideos.forEach(video => {
      const videoElement = videoElements.value[video.id]
      if (videoElement) {
        // 尝试加载视频
        videoElement.load()
        
        // 尝试设置视频时间为1秒，获取一个非黑屏帧
        videoElement.addEventListener('loadedmetadata', () => {
          if (videoElement.duration > 1) {
            videoElement.currentTime = 1
          }
        })
        
        // 当视频可以播放时生成缩略图
        videoElement.addEventListener('canplay', () => {
          generateThumbnail(video)
        })
      }
    })
  }, 100)
}, { deep: true })
</script>

<style scoped>
.bottom-grid-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 1.2rem 0;
  padding-top: 1.2rem;
  border-top: 1px solid rgba(255,255,255,0.05);
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 0.8rem;
  position: relative;
}

.bottom-grid-title::before {
  content: '';
  width: 4px;
  height: 20px;
  background: linear-gradient(180deg, var(--primary), var(--accent));
  border-radius: 2px;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.4rem;
}

.grid-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255,255,255,0.04);
  position: relative;
}

.grid-card::before {
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

.grid-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.5), 0 0 30px rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.25);
}

.grid-card:hover::before {
  opacity: 1;
}

.card-thumbnail {
  height: 150px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumbnail-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
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
  z-index: 2;
}

.thumbnail-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 3;
}

.play-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: rgba(139, 92, 246, 0.9);
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 4;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
}

.play-overlay i {
  font-size: 1.8rem;
  color: white;
  margin-left: 3px;
}

.grid-card:hover .play-overlay {
  transform: translate(-50%, -50%) scale(1.2);
  background: var(--primary);
  box-shadow: 0 8px 25px var(--primary-glow);
}

.time-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0,0,0,0.85);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: white;
  backdrop-filter: blur(4px);
}

.card-info { 
  padding: 1rem 1.1rem; 
}

.card-title { 
  font-weight: 600; 
  font-size: 0.95rem; 
  margin-bottom: 0.5rem; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  color: var(--text-main);
  transition: color 0.3s ease;
}

.grid-card:hover .card-title {
  color: var(--primary);
}

.card-meta { 
  display: flex; 
  justify-content: space-between; 
  font-size: 0.75rem; 
  color: var(--text-dim); 
}
</style>