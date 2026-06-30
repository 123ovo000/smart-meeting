<template>
  <div class="emotion-panel">
    <div class="emotion-panel-header">
      <div class="ep-title">
        <i class="fas fa-smile"></i>
        <span>实时表情识别</span>
      </div>
      <div class="ep-controls">
        <div class="source-tabs" v-if="!isRunning">
          <button 
            :class="['source-tab', { active: videoSource === 'camera' }]" 
            @click="videoSource = 'camera'"
          >
            <i class="fas fa-camera"></i> 摄像头
          </button>
          <button 
            :class="['source-tab', { active: videoSource === 'upload' }]" 
            @click="videoSource = 'upload'"
          >
            <i class="fas fa-upload"></i> 上传视频
          </button>
        </div>
      </div>
    </div>

    <div class="emotion-body">
      <!-- 左侧：视频/摄像头区域 -->
      <div class="emotion-video-area">
        <div class="video-container">
          <video ref="videoRef" autoplay muted playsinline></video>
          <canvas ref="canvasRef"></canvas>
          
          <div v-if="loading" class="loading-overlay">
            <div class="loading-spinner">
              <i class="fas fa-spinner fa-spin"></i>
              <p>{{ loadingText }}</p>
            </div>
          </div>
          
          <div v-if="error" class="error-overlay">
            <i class="fas fa-exclamation-triangle"></i>
            <p>{{ error }}</p>
            <button @click="retry" class="retry-btn">
              <i class="fas fa-redo"></i> 重试
            </button>
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="controls-row">
          <!-- 摄像头选择 -->
          <div v-if="videoSource === 'camera' && cameras.length > 0 && !isRunning" class="camera-select-wrap">
            <i class="fas fa-camera"></i>
            <select v-model="selectedCameraId" class="camera-select">
              <option value="">请选择摄像头...</option>
              <option v-for="cam in cameras" :key="cam.deviceId" :value="cam.deviceId">
                {{ cam.label || `摄像头 ${cam.index + 1}` }}
              </option>
            </select>
          </div>

          <!-- 视频上传 -->
          <div v-if="videoSource === 'upload' && !isRunning" class="upload-wrap">
            <i class="fas fa-file-video"></i>
            <input type="file" accept="video/*" @change="handleVideoUpload" class="video-file-input" />
            <span v-if="uploadedFileName" class="file-name">
              <i class="fas fa-check-circle"></i> {{ uploadedFileName }}
            </span>
          </div>

          <button 
            v-if="videoSource === 'camera'" 
            @click="toggleCamera" 
            :class="['control-btn', isRunning ? 'stop' : 'start']"
            :disabled="!selectedCameraId && !isRunning"
          >
            <i :class="isRunning ? 'fas fa-stop' : 'fas fa-play'"></i>
            {{ isRunning ? '停止' : '开启摄像头' }}
          </button>
          <button 
            v-else 
            @click="toggleVideoPlayback" 
            :class="['control-btn', isPlaying ? 'stop' : 'start']"
            :disabled="!uploadedFile && !isPlaying"
          >
            <i :class="isPlaying ? 'fas fa-stop' : 'fas fa-play'"></i>
            {{ isPlaying ? '停止检测' : '开始检测' }}
          </button>
        </div>

        <!-- 当前表情状态 -->
        <div class="current-emotion" v-if="currentEmotionLabel">
          <div class="ce-emoji">{{ currentEmoji }}</div>
          <div class="ce-info">
            <span class="ce-label" :style="{ color: currentEmotionColor }">{{ currentEmotionLabel }}</span>
            <span class="ce-prob">{{ currentEmotionProb }}%</span>
          </div>
          <div class="ce-desc">{{ currentEmotionText }}</div>
        </div>
      </div>

      <!-- 右侧：统计信息 -->
      <div class="emotion-stats-area" v-if="emotionStats.isRecording">
        <div class="stats-header">
          <i class="fas fa-chart-bar"></i>
          <span>表情统计</span>
        </div>
        
        <div class="stats-summary">
          <div class="stat-item">
            <span class="stat-value">{{ emotionStats.totalDetections }}</span>
            <span class="stat-label">检测次数</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ emotionStats.duration.toFixed(1) }}s</span>
            <span class="stat-label">检测时长</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ dominantEmoji }}</span>
            <span class="stat-label">主要表情</span>
          </div>
        </div>

        <div class="stats-distribution">
          <div class="dist-title">表情分布</div>
          <div class="dist-bars">
            <div v-for="item in distributionBars" :key="item.emotion" class="dist-bar-row">
              <span class="dist-emoji">{{ item.emoji }}</span>
              <span class="dist-label">{{ item.label }}</span>
              <div class="dist-bar-track">
                <div class="dist-bar-fill" :style="{ width: item.percent + '%', background: item.color }"></div>
              </div>
              <span class="dist-percent">{{ item.percent }}%</span>
            </div>
          </div>
        </div>

        <button v-if="emotionStats.isRecording" @click="resetStats" class="reset-btn">
          <i class="fas fa-redo"></i> 重置统计
        </button>
      </div>
    </div>

    <!-- 表情图例 -->
    <div class="emotion-legend">
      <div v-for="emo in emotions" :key="emo.label" class="legend-item">
        <span class="legend-icon">{{ emojiMap[emo.label] }}</span>
        <span class="legend-label">{{ emotionLabels[emo.label] }}</span>
        <span class="legend-dot" :style="{ background: emo.color }"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  EMOTIONS, EMOJI_MAP, EMOTION_COLORS, EMOTION_LABELS, EMOTION_DESCRIPTIONS,
  emotionStats, resetEmotionStats, recordEmotion,
  loadFaceModels, detectFaces, getBestExpression, smoothExpression, resetSmoothing,
  drawDetections
} from '../../services/emotionService'

const emit = defineEmits(['emotion-update'])

const videoRef = ref(null)
const canvasRef = ref(null)
const loading = ref(true)
const loadingText = ref('正在加载模型...')
const error = ref('')
const isRunning = ref(false)

// 当前表情状态
const currentEmotionLabel = ref('')
const currentEmoji = ref('')
const currentEmotionProb = ref('')
const currentEmotionColor = ref('')
const currentEmotionText = ref('')

// 视频来源
const videoSource = ref('camera')
const cameras = ref([])
const selectedCameraId = ref('')
const uploadedFile = ref(null)
const uploadedFileName = ref('')
const isPlaying = ref(false)

let stream = null
let animationId = null
let frameSkip = 0
const FRAME_SKIP = 2

const emotions = EMOTIONS
const emojiMap = EMOJI_MAP
const emotionLabels = EMOTION_LABELS
const emotionColors = EMOTION_COLORS

// 计算主要表情的emoji
const dominantEmoji = computed(() => {
  const dist = emotionStats.distribution
  let maxCount = 0
  let dominant = 'neutral'
  for (const [emotion, count] of Object.entries(dist)) {
    if (count > maxCount) {
      maxCount = count
      dominant = emotion
    }
  }
  return EMOJI_MAP[dominant] || '😐'
})

// 计算分布条
const distributionBars = computed(() => {
  const total = emotionStats.totalDetections || 1
  return EMOTIONS.map(emo => {
    const count = emotionStats.distribution[emo.label] || 0
    return {
      emotion: emo.label,
      emoji: EMOJI_MAP[emo.label],
      label: EMOTION_LABELS[emo.label],
      color: emo.color,
      count,
      percent: ((count / total) * 100).toFixed(1)
    }
  }).filter(item => item.count > 0)
  .sort((a, b) => b.count - a.count)
})

// 获取摄像头列表
async function getCameras() {
  try {
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
    tempStream.getTracks().forEach(track => track.stop())
    
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(d => d.kind === 'videoinput')
    
    cameras.value = videoDevices.map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `摄像头 ${index + 1}`,
      index
    }))
    
    if (cameras.value.length > 0) {
      selectedCameraId.value = cameras.value[0].deviceId
    }
  } catch (err) {
    console.warn('获取摄像头列表失败:', err)
  }
}

// 启动摄像头
async function startCamera() {
  error.value = ''
  try {
    const videoConstraints = {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 }
    }
    
    if (selectedCameraId.value) {
      videoConstraints.deviceId = { exact: selectedCameraId.value }
    } else {
      videoConstraints.facingMode = 'user'
    }
    
    stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false
    })

    const video = videoRef.value
    if (video) {
      video.srcObject = stream
      await new Promise((resolve) => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          resolve()
        } else {
          video.addEventListener('loadedmetadata', resolve, { once: true })
        }
      })
      await video.play()
      
      const canvas = canvasRef.value
      if (canvas) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
      
      isRunning.value = true
      resetEmotionStats()
      resetSmoothing()
      startDetection()
    }
  } catch (err) {
    console.error('摄像头启动失败:', err)
    error.value = '无法访问摄像头，请确保已授予摄像头权限'
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  isRunning.value = false
  
  const canvas = canvasRef.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function toggleCamera() {
  if (isRunning.value) {
    stopCamera()
  } else {
    startCamera()
  }
}

// 视频上传
function handleVideoUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  uploadedFile.value = file
  uploadedFileName.value = file.name
  error.value = ''
}

async function startVideoDetection() {
  error.value = ''
  const video = videoRef.value
  if (!video || !uploadedFile.value) return
  
  try {
    const videoUrl = URL.createObjectURL(uploadedFile.value)
    video.src = videoUrl
    video.muted = true
    
    await new Promise((resolve) => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        resolve()
      } else {
        video.addEventListener('loadedmetadata', resolve, { once: true })
      }
    })
    
    const canvas = canvasRef.value
    if (canvas) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }
    
    await video.play()
    isPlaying.value = true
    isRunning.value = true
    resetEmotionStats()
    resetSmoothing()
    startDetection()
    
    video.addEventListener('ended', () => {
      stopVideoDetection()
    }, { once: true })
    
  } catch (err) {
    console.error('视频播放失败:', err)
    error.value = '视频播放失败，请检查文件格式'
  }
}

function stopVideoDetection() {
  const video = videoRef.value
  if (video) {
    video.pause()
    video.src = ''
    video.load()
  }
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  isPlaying.value = false
  isRunning.value = false
  
  const canvas = canvasRef.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function toggleVideoPlayback() {
  if (isPlaying.value) {
    stopVideoDetection()
  } else {
    startVideoDetection()
  }
}

function retry() {
  error.value = ''
  if (videoSource.value === 'camera') {
    startCamera()
  }
}

// 检测循环
async function startDetection() {
  const video = videoRef.value
  const canvas = canvasRef.value
  if (!video || !canvas) return
  
  if (canvas.width === 0 || canvas.height === 0) {
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
  }
  
  async function detect() {
    if (!isRunning.value) return
    
    frameSkip++
    if (frameSkip < FRAME_SKIP) {
      animationId = requestAnimationFrame(detect)
      return
    }
    frameSkip = 0
    
    const detections = await detectFaces(video)
    
    if (detections && detections.length > 0) {
      const best = getBestExpression(detections)
      if (best && best.probability > 0.3) {
        const smoothed = smoothExpression(best.expression, best.probability)
        
        currentEmotionLabel.value = EMOTION_LABELS[smoothed.expression] || smoothed.expression
        currentEmoji.value = EMOJI_MAP[smoothed.expression] || ''
        currentEmotionProb.value = (smoothed.probability * 100).toFixed(1)
        currentEmotionColor.value = EMOTION_COLORS[smoothed.expression] || '#9ca3af'
        currentEmotionText.value = EMOTION_DESCRIPTIONS[smoothed.expression] || ''
        
        // 记录表情数据
        const videoTime = video.currentTime || 0
        recordEmotion(smoothed.expression, smoothed.probability, videoTime)
        
        // 通知父组件
        emit('emotion-update', {
          emotion: smoothed.expression,
          probability: smoothed.probability,
          videoTime
        })
      }
      
      // 绘制检测结果
      drawDetections(canvas, detections, video.videoWidth, video.videoHeight)
    } else {
      const canvas2 = canvas.getContext('2d')
      canvas2.clearRect(0, 0, canvas.width, canvas.height)
    }
    
    animationId = requestAnimationFrame(detect)
  }
  
  detect()
}

function resetStats() {
  resetEmotionStats()
  resetSmoothing()
  currentEmotionLabel.value = ''
  currentEmoji.value = ''
  currentEmotionProb.value = ''
  currentEmotionColor.value = ''
  currentEmotionText.value = ''
}

onMounted(async () => {
  try {
    await loadFaceModels()
    loading.value = false
    await getCameras()
  } catch (err) {
    error.value = '模型加载失败，请先运行 "node copy-weights.cjs" 复制本地模型文件'
    loading.value = false
  }
})

onUnmounted(() => {
  stopCamera()
  stopVideoDetection()
})
</script>

<style scoped>
.emotion-panel {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255,255,255,0.05);
  overflow: hidden;
}

.emotion-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.2);
}

.ep-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--text-main);
}

.ep-title i {
  color: var(--primary);
  font-size: 1.2rem;
}

.source-tabs {
  display: flex;
  gap: 0.4rem;
}

.source-tab {
  padding: 0.4rem 0.8rem;
  background: var(--bg-hover);
  color: var(--text-muted);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.3s ease;
}

.source-tab:hover {
  background: rgba(99, 102, 241, 0.1);
  color: var(--text-main);
}

.source-tab.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.emotion-body {
  display: flex;
  gap: 1rem;
  padding: 1rem;
}

.emotion-video-area {
  flex: 1;
  min-width: 0;
}

.video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-container video,
.video-container canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-container canvas {
  z-index: 2;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10;
  gap: 1rem;
}

.loading-spinner i {
  font-size: 2.5rem;
  color: var(--primary);
}

.loading-spinner p,
.error-overlay p {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.error-overlay i {
  font-size: 2.5rem;
  color: var(--danger);
}

.retry-btn {
  padding: 0.5rem 1.2rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  background: var(--primary-hover);
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.6rem;
  flex-wrap: wrap;
}

.camera-select-wrap,
.upload-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.camera-select-wrap i,
.upload-wrap i {
  color: var(--primary);
  font-size: 1rem;
}

.camera-select {
  flex: 1;
  padding: 0.4rem 0.6rem;
  background: var(--bg-hover);
  color: var(--text-main);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  outline: none;
}

.camera-select option {
  background: var(--bg-card);
  color: var(--text-main);
}

.video-file-input {
  flex: 1;
  padding: 0.3rem 0;
  color: var(--text-main);
  font-size: 0.8rem;
  cursor: pointer;
}

.video-file-input::file-selector-button {
  padding: 0.3rem 0.8rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  margin-right: 0.5rem;
}

.file-name {
  color: #10b981;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.control-btn {
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.3s ease;
  font-weight: 500;
  white-space: nowrap;
}

.control-btn.start {
  background: var(--primary);
  color: white;
}

.control-btn.start:hover {
  background: var(--primary-hover);
}

.control-btn.stop {
  background: var(--danger);
  color: white;
}

.control-btn.stop:hover {
  background: #e63946;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.current-emotion {
  margin-top: 0.6rem;
  padding: 0.6rem 1rem;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.ce-emoji {
  font-size: 1.8rem;
  line-height: 1;
}

.ce-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ce-label {
  font-size: 1.1rem;
  font-weight: 700;
}

.ce-prob {
  font-size: 0.8rem;
  color: var(--text-muted);
  background: var(--bg-hover);
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
}

.ce-desc {
  color: var(--text-muted);
  font-size: 0.85rem;
  flex: 1;
  min-width: 120px;
}

/* 右侧统计区域 */
.emotion-stats-area {
  width: 280px;
  flex-shrink: 0;
  background: rgba(0,0,0,0.15);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: bold;
  color: var(--text-main);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.stats-header i {
  color: var(--primary);
}

.stats-summary {
  display: flex;
  gap: 0.5rem;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  background: var(--bg-hover);
  border-radius: 6px;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--accent);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

.stats-distribution {
  flex: 1;
}

.dist-title {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.dist-bars {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.dist-bar-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.dist-emoji {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

.dist-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  width: 30px;
}

.dist-bar-track {
  flex: 1;
  height: 8px;
  background: var(--bg-hover);
  border-radius: 4px;
  overflow: hidden;
}

.dist-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.dist-percent {
  font-size: 0.7rem;
  color: var(--text-muted);
  width: 35px;
  text-align: right;
}

.reset-btn {
  padding: 0.4rem 0.8rem;
  background: var(--bg-hover);
  color: var(--text-muted);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.3s ease;
}

.reset-btn:hover {
  background: rgba(255,71,87,0.1);
  color: var(--danger);
  border-color: var(--danger);
}

/* 表情图例 */
.emotion-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  border-top: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.1);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.5rem;
  background: var(--bg-hover);
  border-radius: 4px;
  font-size: 0.75rem;
}

.legend-icon {
  font-size: 1rem;
}

.legend-label {
  color: var(--text-muted);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

@media (max-width: 900px) {
  .emotion-body {
    flex-direction: column;
  }
  .emotion-stats-area {
    width: 100%;
  }
}
</style>
