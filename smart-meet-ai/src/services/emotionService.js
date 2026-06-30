// src/services/emotionService.js
// 封装 face-api.js 表情识别逻辑，记录每个表情的时间信息

import { ref, reactive } from 'vue'

// ====== 表情常量 ======
export const EMOTIONS = [
  { label: 'neutral', color: '#9ca3af' },
  { label: 'happy', color: '#fbbf24' },
  { label: 'sad', color: '#60a5fa' },
  { label: 'angry', color: '#ef4444' },
  { label: 'fearful', color: '#a78bfa' },
  { label: 'disgusted', color: '#34d399' },
  { label: 'surprised', color: '#f472b6' }
]

export const EMOJI_MAP = {
  'neutral': '😐',
  'happy': '😊',
  'sad': '😢',
  'angry': '😠',
  'fearful': '😨',
  'disgusted': '🤢',
  'surprised': '😲'
}

export const EMOTION_COLORS = {
  'neutral': '#9ca3af',
  'happy': '#fbbf24',
  'sad': '#60a5fa',
  'angry': '#ef4444',
  'fearful': '#a78bfa',
  'disgusted': '#34d399',
  'surprised': '#f472b6'
}

export const EMOTION_DESCRIPTIONS = {
  'neutral': '当前情绪平稳，表情自然放松。',
  'happy': '检测到愉悦情绪，看起来心情不错！😊',
  'sad': '检测到低落情绪，是否需要休息一下？',
  'angry': '检测到不满情绪，建议深呼吸放松。',
  'fearful': '检测到紧张情绪，放轻松一些~',
  'disgusted': '检测到反感情绪，有什么不愉快的吗？',
  'surprised': '检测到惊讶表情，是有什么惊喜吗？😲'
}

export const EMOTION_LABELS = {
  'neutral': '平静',
  'happy': '开心',
  'sad': '难过',
  'angry': '生气',
  'fearful': '紧张',
  'disgusted': '反感',
  'surprised': '惊讶'
}

// ====== 表情数据记录 ======
// 存储每次检测到的表情记录（带时间戳）- 按视频ID管理
export const emotionRecords = ref([])

// 当前会话的统计摘要
export const emotionStats = reactive({
  totalDetections: 0,
  duration: 0, // 检测总时长（秒）
  distribution: {}, // { emotion: count }
  timeline: [], // 时间线数据 [{time, emotion, probability}]
  startTime: null,
  isRecording: false,
  currentVideoId: null // 当前视频ID
})

// 重置统计（切换视频时调用）
export function resetEmotionStats(videoId = null) {
  emotionRecords.value = []
  emotionStats.totalDetections = 0
  emotionStats.duration = 0
  emotionStats.distribution = {}
  emotionStats.timeline = []
  emotionStats.startTime = null
  emotionStats.isRecording = false
  emotionStats.currentVideoId = videoId
}

// 记录一次表情检测结果
export function recordEmotion(emotion, probability, videoTime) {
  if (!emotionStats.isRecording) {
    emotionStats.isRecording = true
    emotionStats.startTime = Date.now()
  }

  const record = {
    timestamp: Date.now(),
    videoTime: videoTime || 0,
    emotion,
    probability,
    videoId: emotionStats.currentVideoId
  }

  emotionRecords.value.push(record)

  // 更新统计
  emotionStats.totalDetections++
  emotionStats.duration = (Date.now() - emotionStats.startTime) / 1000
  emotionStats.distribution[emotion] = (emotionStats.distribution[emotion] || 0) + 1

  // 每10帧记录一次时间线数据（减少数据量）
  if (emotionStats.timeline.length === 0 || 
      emotionStats.totalDetections % 10 === 0) {
    emotionStats.timeline.push({
      time: emotionStats.duration.toFixed(1),
      videoTime: videoTime.toFixed(1),
      emotion,
      probability: (probability * 100).toFixed(1)
    })
  }
}

// 获取指定视频的表情记录
export function getEmotionRecordsByVideo(videoId) {
  return emotionRecords.value.filter(r => r.videoId === videoId)
}

// 保存表情数据到视频对象
export function saveEmotionDataToVideo(video) {
  if (video && emotionStats.totalDetections > 0) {
    video.emotionData = {
      records: [...emotionRecords.value],
      stats: {
        totalDetections: emotionStats.totalDetections,
        duration: emotionStats.duration,
        distribution: { ...emotionStats.distribution },
        timeline: [...emotionStats.timeline]
      }
    }
    // 同时保存到IndexedDB
    try {
      const db = indexedDB.open('SmartMeetAI', 1)
      db.onsuccess = () => {
        const transaction = db.result.transaction('videos', 'readwrite')
        const store = transaction.objectStore('videos')
        store.put(video)
      }
    } catch (e) {
      console.warn('保存表情数据到IndexedDB失败:', e)
    }
  }
}

// 获取表情分布百分比
export function getEmotionDistribution() {
  const total = emotionStats.totalDetections || 1
  const distribution = {}
  for (const [emotion, count] of Object.entries(emotionStats.distribution)) {
    distribution[emotion] = ((count / total) * 100).toFixed(1)
  }
  return distribution
}

// 获取主要表情（出现最多的）
export function getDominantEmotion() {
  let maxCount = 0
  let dominant = 'neutral'
  for (const [emotion, count] of Object.entries(emotionStats.distribution)) {
    if (count > maxCount) {
      maxCount = count
      dominant = emotion
    }
  }
  return dominant
}

// ====== 模型加载 ======
let modelsLoaded = false

export async function loadFaceModels() {
  if (modelsLoaded) return true

  const MODEL_URLS = [
    '/models',
    'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/',
    'https://justadudewhohacks.github.io/face-api.js/weights',
    'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'
  ]

  for (const url of MODEL_URLS) {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(url)
      await faceapi.nets.faceLandmark68Net.loadFromUri(url)
      await faceapi.nets.faceExpressionNet.loadFromUri(url)
      modelsLoaded = true
      console.log(`✓ 模型从 ${url} 加载成功`)
      return true
    } catch (e) {
      console.warn(`从 ${url} 加载模型失败，尝试下一个源...`)
    }
  }
  throw new Error('所有模型源均加载失败')
}

// ====== 检测参数 ======
const DETECTION_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.3
})

// ====== 执行检测 ======
export async function detectFaces(video) {
  if (!video || !video.videoWidth) return null
  
  try {
    const detections = await faceapi
      .detectAllFaces(video, DETECTION_OPTIONS)
      .withFaceLandmarks()
      .withFaceExpressions()
    return detections
  } catch (err) {
    console.error('检测出错:', err)
    return null
  }
}

// ====== 获取最佳表情（取面积最大的人脸） ======
export function getBestExpression(detections) {
  if (!detections || detections.length === 0) return null

  // 按检测框面积排序，取最大的
  const sorted = [...detections].sort((a, b) => {
    const areaA = a.detection.box.width * a.detection.box.height
    const areaB = b.detection.box.width * b.detection.box.height
    return areaB - areaA
  })

  const first = sorted[0]
  const expressions = first.expressions
  let maxExpression = ''
  let maxProbability = 0

  for (const [expr, prob] of Object.entries(expressions)) {
    if (prob > maxProbability) {
      maxProbability = prob
      maxExpression = expr
    }
  }

  return {
    expression: maxExpression,
    probability: maxProbability,
    detection: first,
    expressions
  }
}

// ====== 平滑处理 ======
let lastExpression = 'neutral'
let lastProbability = 0

export function smoothExpression(expression, probability) {
  if (lastProbability === 0) {
    lastExpression = expression
    lastProbability = probability
  } else if (expression !== lastExpression) {
    if (probability > 0.5) {
      lastExpression = expression
      lastProbability = probability
    }
  } else {
    lastProbability = lastProbability * 0.3 + probability * 0.7
  }
  
  return {
    expression: lastExpression,
    probability: lastProbability
  }
}

export function resetSmoothing() {
  lastExpression = 'neutral'
  lastProbability = 0
}

// ====== 绘制检测结果到Canvas ======
export function drawDetections(canvas, detections, videoWidth, videoHeight) {
  if (!canvas || !detections) return

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const displaySize = { width: videoWidth, height: videoHeight }
  const resizedDetections = faceapi.resizeResults(detections, displaySize)

  resizedDetections.forEach(detection => {
    const landmarks = detection.landmarks
    const expressions = detection.expressions
    const box = detection.detection.box

    // 找出概率最高的表情
    let maxExpr = ''
    let maxProb = 0
    for (const [expr, prob] of Object.entries(expressions)) {
      if (prob > maxProb) {
        maxProb = prob
        maxExpr = expr
      }
    }

    const color = EMOTION_COLORS[maxExpr] || '#00e5ff'

    // 绘制面部特征点
    drawFaceFeatures(ctx, landmarks, color)

    // 在额头位置显示表情标签
    drawEmotionLabel(ctx, box, maxExpr, maxProb, color)
  })
}

function drawLandmarkPath(ctx, points, closePath) {
  if (!points || points.length === 0) return
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  if (closePath) ctx.closePath()
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawFaceFeatures(ctx, landmarks, color) {
  const jawPositions = landmarks.getJawOutline()
  const leftEyeBrow = landmarks.getLeftEyeBrow()
  const rightEyeBrow = landmarks.getRightEyeBrow()
  const nose = landmarks.getNose()
  const leftEye = landmarks.getLeftEye()
  const rightEye = landmarks.getRightEye()
  const mouth = landmarks.getMouth()

  // 面部轮廓
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.lineWidth = 1
  drawLandmarkPath(ctx, jawPositions, false)
  ctx.stroke()

  // 眉毛
  ctx.strokeStyle = color
  ctx.lineWidth = 2.5
  drawLandmarkPath(ctx, leftEyeBrow, false)
  ctx.stroke()
  drawLandmarkPath(ctx, rightEyeBrow, false)
  ctx.stroke()

  // 眼睛
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  drawLandmarkPath(ctx, leftEye, true)
  ctx.stroke()
  drawLandmarkPath(ctx, rightEye, true)
  ctx.stroke()

  // 瞳孔
  ctx.fillStyle = color
  leftEye.forEach((point, i) => {
    if (i === 0 || i === 3) {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  rightEye.forEach((point, i) => {
    if (i === 0 || i === 3) {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  // 鼻子
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1.5
  if (nose.length >= 3) {
    ctx.beginPath()
    ctx.moveTo(nose[0].x, nose[0].y)
    ctx.lineTo(nose[2].x, nose[2].y)
    ctx.stroke()
  }
  if (nose.length >= 6) {
    ctx.beginPath()
    ctx.moveTo(nose[3].x, nose[3].y)
    ctx.lineTo(nose[4].x, nose[4].y)
    ctx.lineTo(nose[5].x, nose[5].y)
    ctx.stroke()
  }

  // 嘴巴
  ctx.strokeStyle = color
  ctx.lineWidth = 2.5
  const upperLip = mouth.slice(0, 12)
  drawLandmarkPath(ctx, upperLip, true)
  ctx.stroke()

  const lowerLip = [mouth[6], mouth[7], mouth[8], mouth[9], mouth[10], mouth[11], mouth[6]]
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(lowerLip[0].x, lowerLip[0].y)
  for (let i = 1; i < lowerLip.length; i++) {
    ctx.lineTo(lowerLip[i].x, lowerLip[i].y)
  }
  ctx.stroke()

  // 嘴唇中线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(mouth[0].x, mouth[0].y)
  ctx.lineTo(mouth[6].x, mouth[6].y)
  ctx.stroke()
  ctx.setLineDash([])
}

function drawEmotionLabel(ctx, box, maxExpr, maxProb, color) {
  const label = `${EMOJI_MAP[maxExpr] || ''} ${EMOTION_LABELS[maxExpr] || maxExpr} ${(maxProb * 100).toFixed(1)}%`
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  const textWidth = ctx.measureText(label).width
  const labelHeight = 32
  const labelX = box.x + box.width / 2 - textWidth / 2 - 10
  const labelY = box.y - labelHeight - 8

  const lx = Math.max(0, labelX)
  const ly = labelY < 0 ? box.y + 5 : labelY
  const lw = textWidth + 20

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  drawRoundRect(ctx, lx, ly, lw, labelHeight, 8)
  ctx.fill()

  ctx.strokeStyle = color
  ctx.lineWidth = 2
  drawRoundRect(ctx, lx, ly, lw, labelHeight, 8)
  ctx.stroke()

  ctx.fillStyle = color
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillText(label, lx + 10, ly + 21)
}