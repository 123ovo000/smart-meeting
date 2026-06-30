<template>
  <div class="video-player-container">
    <div v-if="video" class="video-content">
      <div class="video-wrapper">
        <video 
          ref="videoElement" 
          controls
          width="100%" 
          height="auto"
          preload="metadata"
          playsinline
          webkit-playsinline
          @play="onVideoPlay"
          @pause="onVideoPause"
          @ended="onVideoEnded"
          @timeupdate="onTimeUpdate"
        >
          <source :src="video.url" :type="video.type">
          您的浏览器不支持视频播放。
        </video>
        <canvas ref="overlayCanvas" class="emotion-overlay"></canvas>

        <!-- 当前表情状态浮层 -->
        <div v-if="currentEmotionLabel && isEmotionActive" class="emotion-badge" :style="{ borderColor: currentEmotionColor }">
          <span class="eb-emoji">{{ currentEmoji }}</span>
          <span class="eb-label" :style="{ color: currentEmotionColor }">{{ currentEmotionLabel }}</span>
          <span class="eb-prob">{{ currentEmotionProb }}%</span>
        </div>

        <!-- 模型加载中 -->
        <div v-if="modelLoading" class="model-loading-overlay">
          <i class="fas fa-spinner fa-spin"></i>
          <span>{{ modelLoadingText }}</span>
        </div>
      </div>

      <div class="video-info">
        <div class="video-header">
          <h3>{{ video.name }}</h3>
          <div class="video-actions">
            <button class="star-btn" @click="addStarredFragment" title="收藏当前片段">
              <i class="fas fa-star"></i>
              收藏片段
            </button>
            <button 
              v-if="isEmotionReady"
              :class="['emotion-toggle-btn', { active: isEmotionActive }]" 
              @click="toggleEmotionDetection"
              :title="isEmotionActive ? '关闭表情识别' : '开启表情识别'"
            >
              <i :class="isEmotionActive ? 'fas fa-smile' : 'fas fa-meh'"></i>
              {{ isEmotionActive ? '表情识别中' : '表情识别' }}
            </button>
          </div>
        </div>
        <div class="video-meta">
          <span>{{ video.uploadDate }}</span>
          <span class="current-time">当前: {{ formatTime(currentTime) }}</span>
        </div>

        <!-- 表情数据保存设置 -->
        <div v-if="video?.emotionData || isEmotionReady" class="emotion-save-settings">
          <label class="save-option">
            <input 
              type="checkbox" 
              v-model="saveEmotionData" 
              :disabled="!video"
            />
            <span>保存表情数据</span>
          </label>
          <label class="save-option" v-if="video?.emotionData">
            <input 
              type="checkbox" 
              v-model="replaceExistingData" 
            />
            <span>替换已有数据</span>
          </label>
          <span v-if="video?.emotionData" class="existing-data-badge">
            已有 {{ video.emotionData.stats?.totalDetections || 0 }} 条记录
          </span>
        </div>

        <!-- 表情识别状态栏 -->
        <div v-if="isEmotionActive && emotionStats.isRecording" class="emotion-status-bar">
          <div class="es-item">
            <span class="es-label">检测</span>
            <span class="es-value">{{ emotionStats.totalDetections }}次</span>
          </div>
          <div class="es-item">
            <span class="es-label">时长</span>
            <span class="es-value">{{ emotionStats.duration.toFixed(1) }}s</span>
          </div>
          <div class="es-item">
            <span class="es-label">主要</span>
            <span class="es-value">{{ dominantEmoji }} {{ dominantLabel }}</span>
          </div>
          <button class="es-reset-btn" @click="resetStats" title="重置统计">
            <i class="fas fa-redo"></i>
          </button>
          <button class="es-save-btn" @click="manualSaveEmotionData" title="手动保存数据">
            <i class="fas fa-save"></i>
          </button>
        </div>
      </div>
    </div>
    <div v-else class="video-placeholder">
      <i class="fas fa-play-circle"></i>
      <p>选择一个视频进行播放</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  EMOTION_LABELS, EMOJI_MAP, EMOTION_COLORS, EMOTION_DESCRIPTIONS,
  emotionStats, emotionRecords, resetEmotionStats, recordEmotion, saveEmotionDataToVideo,
  loadFaceModels, detectFaces, getBestExpression, smoothExpression, resetSmoothing,
  drawDetections
} from '../../services/emotionService'

const props = defineProps({
  video: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['play-video', 'emotion-update'])

const videoElement = ref(null)
const overlayCanvas = ref(null)
const currentTime = ref(0)

// 表情识别状态
const modelLoading = ref(false)
const modelLoadingText = ref('')
const isEmotionReady = ref(false)
const isEmotionActive = ref(false)
const currentEmotionLabel = ref('')
const currentEmoji = ref('')
const currentEmotionProb = ref('')
const currentEmotionColor = ref('')
const currentEmotionText = ref('')

// 表情数据保存设置
const saveEmotionData = ref(true)
const replaceExistingData = ref(false)

let animationId = null
let frameSkip = 0
const FRAME_SKIP = 3

// 计算主要表情
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

const dominantLabel = computed(() => {
  const dist = emotionStats.distribution
  let maxCount = 0
  let dominant = 'neutral'
  for (const [emotion, count] of Object.entries(dist)) {
    if (count > maxCount) {
      maxCount = count
      dominant = emotion
    }
  }
  return EMOTION_LABELS[dominant] || dominant
})

// 格式化时间
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 保存星标片段
const saveStarredItems = (items) => {
  localStorage.setItem('smartMeetStarredItems', JSON.stringify(items))
}

const loadStarredItems = () => {
  return JSON.parse(localStorage.getItem('smartMeetStarredItems') || '[]')
}

const addStarredFragment = () => {
  if (!videoElement.value || !props.video) return
  const ct = videoElement.value.currentTime
  const timeString = formatTime(ct)
  const title = prompt('请输入片段标题:', `片段 ${timeString}`)
  if (!title) return
  const description = prompt('请输入片段描述:')
  const starredItem = {
    id: Date.now(),
    type: 'video',
    title,
    description: description || '',
    time: timeString,
    timestamp: ct,
    date: new Date().toISOString().split('T')[0],
    meetingId: props.video.id,
    meetingName: props.video.name,
    speaker: '',
    tags: []
  }
  const existingItems = loadStarredItems()
  existingItems.push(starredItem)
  saveStarredItems(existingItems)
  alert('片段已成功收藏！')
}

// 时间更新
const onTimeUpdate = () => {
  if (videoElement.value) {
    currentTime.value = videoElement.value.currentTime
    
    // 发送事件通知智能亮标轴更新当前时间
    const duration = videoElement.value.duration || 600
    const [hours, mins] = formatTime(currentTime.value).split(':').map(Number)
    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
    
    const event = new CustomEvent('video-time-update', {
      detail: { time: timeStr, duration: duration, currentTime: currentTime.value },
      bubbles: true,
      composed: true
    })
    document.dispatchEvent(event)
  }
}

// 视频播放/暂停事件
const onVideoPlay = () => {
  if (isEmotionActive.value && isEmotionReady.value) {
    startEmotionDetection()
  }
}

const onVideoPause = () => {
  stopEmotionDetection()
}

const onVideoEnded = () => {
  stopEmotionDetection()
}

// 监听视频变化，重置表情数据
watch(() => props.video, (newVideo, oldVideo) => {
  if (newVideo && newVideo.id !== oldVideo?.id) {
    // 停止当前的表情检测
    stopEmotionDetection()
    clearCanvas()
    
    // 重置表情数据，关联到新视频
    resetEmotionStats(newVideo.id)
    
    // 如果新视频有保存的表情数据，加载它
    if (newVideo.emotionData) {
      emotionRecords.value = [...newVideo.emotionData.records]
      Object.assign(emotionStats, newVideo.emotionData.stats)
      emotionStats.currentVideoId = newVideo.id
    }
  }
}, { immediate: true })

// 手动保存表情数据
const manualSaveEmotionData = () => {
  if (props.video && emotionStats.totalDetections > 0) {
    saveEmotionDataToVideo(props.video)
    alert('表情数据已保存！')
  }
}

// 切换表情识别
const toggleEmotionDetection = () => {
  if (isEmotionActive.value) {
    isEmotionActive.value = false
    stopEmotionDetection()
    clearCanvas()
    // 保存表情数据到视频对象
    if (props.video && saveEmotionData.value && emotionStats.totalDetections > 0) {
      saveEmotionDataToVideo(props.video)
      alert('表情数据已自动保存！')
    }
  } else {
    isEmotionActive.value = true
    
    // 如果有已有数据且不替换，则加载已有数据
    if (props.video?.emotionData && !replaceExistingData.value) {
      console.log('📥 加载已保存的表情数据')
      emotionRecords.value = [...props.video.emotionData.records]
      Object.assign(emotionStats, props.video.emotionData.stats)
      emotionStats.currentVideoId = props.video.id
      emotionStats.isRecording = true
    } else {
      // 重置表情数据，关联到当前视频
      console.log('🔄 开始新的表情记录')
      resetEmotionStats(props.video?.id)
      resetSmoothing()
    }
    
    if (videoElement.value && !videoElement.value.paused) {
      startEmotionDetection()
    }
  }
}

// 启动表情检测
function startEmotionDetection() {
  const video = videoElement.value
  const canvas = overlayCanvas.value
  if (!video || !canvas) return

  // 设置canvas尺寸匹配视频
  canvas.width = video.videoWidth || video.clientWidth
  canvas.height = video.videoHeight || video.clientHeight

  async function detect() {
    if (!isEmotionActive.value || video.paused || video.ended) return

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
        recordEmotion(smoothed.expression, smoothed.probability, video.currentTime || 0)

        // 通知父组件
        emit('emotion-update', {
          emotion: smoothed.expression,
          probability: smoothed.probability,
          videoTime: video.currentTime
        })
      }

      // 绘制检测结果到canvas
      drawDetections(canvas, detections, video.videoWidth, video.videoHeight)
    } else {
      clearCanvas()
    }

    animationId = requestAnimationFrame(detect)
  }

  detect()
}

function stopEmotionDetection() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

function clearCanvas() {
  const canvas = overlayCanvas.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function resetStats() {
  resetEmotionStats()
  resetSmoothing()
  currentEmotionLabel.value = ''
  currentEmoji.value = ''
  currentEmotionProb.value = ''
  currentEmotionColor.value = ''
  currentEmotionText.value = ''
  clearCanvas()
}

// 监听视频变化
watch(() => props.video, async (newVideo, oldVideo) => {
  // 停止当前视频的表情检测
  stopEmotionDetection()
  clearCanvas()
  
  if (oldVideo && videoElement.value) {
    videoElement.value.pause()
    videoElement.value.currentTime = 0
  }

  if (newVideo && videoElement.value) {
    await nextTick()
    videoElement.value.load()

    videoElement.value.onloadeddata = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const timestamp = urlParams.get('timestamp')
      if (timestamp) {
        videoElement.value.currentTime = parseFloat(timestamp)
      }
      videoElement.value.play().catch(error => {
        console.error('视频播放失败:', error)
      })
    }

    videoElement.value.onerror = (e) => {
      console.error('视频加载错误:', e)
    }
    
    // 🎯 加载已保存的表情数据
    if (newVideo.emotionData && isEmotionActive.value) {
      console.log('📥 切换视频，加载已保存的表情数据')
      emotionRecords.value = [...newVideo.emotionData.records]
      Object.assign(emotionStats, newVideo.emotionData.stats)
      emotionStats.currentVideoId = newVideo.id
      emotionStats.isRecording = true
    }
  }
})

// 初始化加载模型
onMounted(async () => {
  try {
    modelLoading.value = true
    modelLoadingText.value = '正在加载表情识别模型...'
    await loadFaceModels()
    isEmotionReady.value = true
    modelLoading.value = false
  } catch (err) {
    console.error('模型加载失败:', err)
    modelLoading.value = false
  }
})

onUnmounted(() => {
  stopEmotionDetection()
})
</script>

<style scoped>
.video-player-container {
  width: 100%;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 15px 40px rgba(0,0,0,0.6), 0 0 60px rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(255,255,255,0.06);
  transition: all 0.3s ease;
}

.video-player-container:hover {
  border-color: rgba(139, 92, 246, 0.2);
  box-shadow: 0 15px 40px rgba(0,0,0,0.7), 0 0 80px rgba(139, 92, 246, 0.08);
}

.video-content {
  display: flex;
  flex-direction: column;
}

.video-wrapper {
  position: relative;
  width: 100%;
  background: #000;
}

.video-wrapper video {
  width: 100%;
  height: auto;
  aspect-ratio: 16/9;
  display: block;
}

.emotion-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

/* 表情状态浮层 */
.emotion-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.75);
  border: 2px solid;
  border-radius: 24px;
  z-index: 3;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.eb-emoji {
  font-size: 1.4rem;
  line-height: 1;
  animation: emojiBounce 2s ease-in-out infinite;
}

@keyframes emojiBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.eb-label {
  font-size: 0.85rem;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.eb-prob {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.12);
  padding: 2px 8px;
  border-radius: 10px;
  font-family: 'SF Mono', Monaco, monospace;
}

/* 模型加载浮层 */
.model-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(0,0,0,0.7);
  z-index: 5;
  color: var(--text-muted);
  font-size: 0.95rem;
  backdrop-filter: blur(4px);
}

.model-loading-overlay i {
  font-size: 2rem;
  color: var(--primary);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.model-loading-overlay::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border: 3px solid rgba(139, 92, 246, 0.2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 视频信息区 */
.video-info {
  padding: 1.2rem 1.5rem;
  background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%);
  border-top: 1px solid rgba(255,255,255,0.05);
}

.video-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.video-info h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  background: linear-gradient(135deg, var(--text-main), var(--text-muted));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.video-actions {
  display: flex;
  gap: 0.5rem;
}

.star-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.star-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--primary-glow);
}

.emotion-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: var(--bg-input);
  color: var(--text-muted);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.emotion-toggle-btn:hover {
  background: var(--bg-hover);
  color: var(--text-main);
  border-color: rgba(255,255,255,0.15);
}

.emotion-toggle-btn.active {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.08));
  color: var(--primary);
  border-color: var(--primary);
  box-shadow: 0 0 15px var(--primary-glow);
}

.video-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-top: 0.3rem;
}

.current-time {
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-muted);
  background: rgba(255,255,255,0.05);
  padding: 2px 8px;
  border-radius: 6px;
}

/* 表情数据保存设置 */
.emotion-save-settings {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.6rem;
  padding: 0.5rem 0.8rem;
  background: rgba(139, 92, 246, 0.05);
  border-radius: var(--radius-md);
  border: 1px solid rgba(139, 92, 246, 0.1);
}

.save-option {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  cursor: pointer;
}

.save-option input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--primary);
  cursor: pointer;
}

.save-option input[type="checkbox"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.existing-data-badge {
  font-size: 0.75rem;
  color: var(--accent);
  background: rgba(6, 182, 212, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  margin-left: auto;
}

/* 表情识别状态栏 */
.emotion-status-bar {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-top: 0.8rem;
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.05));
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: var(--radius-md);
}

.es-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.es-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.es-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
}

.es-reset-btn {
  margin-left: auto;
  padding: 0.4rem 0.8rem;
  background: transparent;
  color: var(--text-dim);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s ease;
}

.es-reset-btn:hover {
  background: rgba(239, 68, 68, 0.12);
  color: var(--danger);
  border-color: var(--danger);
  transform: scale(1.05);
}

.es-save-btn {
  margin-left: 0.5rem;
  padding: 0.4rem 0.8rem;
  background: transparent;
  color: var(--text-dim);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s ease;
}

.es-save-btn:hover {
  background: rgba(16, 185, 129, 0.12);
  color: var(--success);
  border-color: var(--success);
  transform: scale(1.05);
}

.video-placeholder {
  width: 100%;
  aspect-ratio: 16/9;
  background: linear-gradient(135deg, var(--bg-card) 0%, rgba(139, 92, 246, 0.05) 50%, var(--bg-card) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  position: relative;
  overflow: hidden;
}

.video-placeholder::before {
  content: '';
  position: absolute;
  top: 0;
  left: -50%;
  width: 200%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--primary), transparent);
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(50%); }
}

.video-placeholder i {
  font-size: 5rem;
  margin-bottom: 1.2rem;
  color: var(--primary);
  opacity: 0.4;
  animation: iconPulse 2s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

.video-placeholder p {
  font-size: 1.15rem;
  font-weight: 500;
  color: var(--text-dim);
}
</style>