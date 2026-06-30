<template>
  <div class="right-column">
    <!-- 头部 -->
    <div class="column-header">
      <div class="column-title">
        <div class="title-icon">
          <i class="fas fa-bar-chart-line"></i>
        </div>
        <span>智能亮点轴</span>
      </div>
      <div class="column-stats">
        <span class="stats-number">{{ highlights.length }}</span>
        <span class="stats-label">关键帧</span>
      </div>
    </div>
    
    <!-- 播放进度指示器 -->
    <div class="progress-indicator">
      <div class="progress-track">
        <div class="progress-fill" :style="{ height: progressPercent + '%' }"></div>
        <div class="progress-glow" :style="{ top: progressPercent + '%' }"></div>
      </div>
    </div>

    <!-- 关键帧列表 -->
    <div class="highlights-list">
      <div 
        v-for="(highlight, index) in highlights" 
        :key="index"
        class="highlight-item" 
        :class="{ 'active-highlight': highlight.isActive, 'past-highlight': isPastHighlight(index) }"
        @click="selectHighlight(highlight)"
      >
        <!-- 时间轴标记 -->
        <div class="timeline-marker">
          <div :class="['marker-dot', { active: highlight.isActive }]"></div>
          <div v-if="index < highlights.length - 1" class="marker-line"></div>
        </div>
        
        <div class="highlight-content">
          <!-- 🎯 智能问答展示 - 只显示问题 -->
          <div class="qa-item">
            <div class="qa-header">
              <span class="qa-number">Q{{ highlight.questionNumber }}</span>
              <span class="qa-time">{{ highlight.time }}</span>
              <span class="current-badge" v-if="highlight.isActive">当前</span>
            </div>
            <div class="qa-question">
              {{ highlight.description }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { currentVideo } from '../../services/videoService'

const API_BASE = 'http://localhost:3001'

const highlights = ref([])
const currentTime = ref('00:00')
const videoDuration = ref(600) // 默认10分钟

// 计算进度百分比
const progressPercent = computed(() => {
  if (!currentTime.value || videoDuration.value === 0) return 0
  const [hours, mins] = currentTime.value.split(':').map(Number)
  const currentSeconds = hours * 3600 + mins * 60
  return Math.min((currentSeconds / videoDuration.value) * 100, 100)
})

// 判断是否是已播放过的关键帧
const isPastHighlight = (index) => {
  if (!currentTime.value || highlights.value.length === 0) return false
  const [ch, cm] = currentTime.value.split(':').map(Number)
  const currentSeconds = ch * 3600 + cm * 60
  
  const highlight = highlights.value[index]
  const [hh, mm] = highlight.time.split(':').map(Number)
  const highlightSeconds = hh * 3600 + mm * 60
  
  return highlightSeconds <= currentSeconds && !highlight.isActive
}

// 🎯 使用假数据显示智能问答
const fetchAIAnalyses = async () => {
  try {
    console.log('📡 使用假数据显示智能问答...')
    
    // 假的智能问答数据
    const fakeQAData = `**Q1: 本次会议的主要议题是什么？**
> 💡 **答：** 本次会议主要讨论Q4产品规划、技术架构设计以及团队资源调配。

**Q2: 产品上线时间计划是什么？**
> 💡 **答：** 计划于12月15日前完成开发和测试，12月20日正式上线。

**Q3: 技术方案有哪些关键点？**
> 💡 **答：** 采用微服务架构，使用Redis缓存优化性能，引入消息队列实现异步处理。

**Q4: 如何保证项目质量？**
> 💡 **答：** 将进行多轮测试，包括单元测试、集成测试和用户验收测试，确保质量达标。`
    
    // 使用假数据
    console.log('✅ 使用假数据显示智能问答')
    parseQAAnalysis(fakeQAData, 'fake-job-id')
    
  } catch (err) {
    console.error('获取 AI 分析数据失败:', err)
    highlights.value = getDefaultHighlights()
  }
}
// 🎯 解析智能问答数据 - 更健壮的版本
const parseQAAnalysis = (qaText, jobId) => {
  const items = []
  
  if (!qaText || typeof qaText !== 'string' || qaText.length < 10) {
    console.warn('无效的问答文本:', qaText)
    highlights.value = [{
      time: '00:00',
      description: '当前视频尚未进行AI分析或分析数据为空',
      isQA: true,
      questionNumber: 0,
      isActive: true,
      jobId: jobId,
      isEmpty: true
    }]
    return
  }
  
  console.log('解析问答文本长度:', qaText.length, '前100字符:', qaText.substring(0, 100))
  
  // 尝试多种可能的格式
  let questions = []
  let answers = []
  
  // 格式1: **Q1: 问题** > 💡 **答：** 答案
  const qaPattern1 = /\*\*Q(\d+):\s*([^\*]+?)\*\*[\s\n\r]*>[^>]*💡\s*\*\*答：\*\*\s*([^\n>]+)/g
  let match1
  while ((match1 = qaPattern1.exec(qaText)) !== null) {
    questions.push({ index: parseInt(match1[1]), question: match1[2].trim() })
    answers.push(match1[3].trim())
  }
  
  // 如果格式1没有匹配到，尝试格式2: 单独的Q和A
  if (questions.length === 0) {
    const questionPattern = /\*\*Q(\d+):\s*([^\*]+?)\*\*/g
    const answerPattern = /> 💡 \*\*答：\*\*\s*([^\n>]+)/g
    
    let qMatch
    while ((qMatch = questionPattern.exec(qaText)) !== null) {
      questions.push({ index: parseInt(qMatch[1]), question: qMatch[2].trim() })
    }
    
    let aMatch
    while ((aMatch = answerPattern.exec(qaText)) !== null) {
      answers.push(aMatch[1].trim())
    }
  }
  
  // 如果仍然没有匹配到，尝试更简单的模式
  if (questions.length === 0) {
    // 查找 "Q:" 或 "问题：" 模式的
    const simpleQPattern = /(Q\d*:|问题\d*:|问题\s*[:：])\s*([^\n\r]+)/gi
    let simpleMatch
    while ((simpleMatch = simpleQPattern.exec(qaText)) !== null) {
      questions.push({ index: questions.length + 1, question: simpleMatch[2].trim() })
    }
  }
  
  // 创建高亮项
  if (questions.length > 0) {
    questions.forEach((q, idx) => {
      const answer = answers[idx] || '暂无答案'
      items.push({
        time: formatTimeFromMinute(idx * 5 + 2),
        description: q.question,
        answer: answer,
        isQA: true,
        questionNumber: q.index,
        isActive: idx === 0,
        jobId: jobId
      })
    })
  } else {
    // 如果没有找到问题，尝试从文本中提取关键句子作为问题
    const sentences = qaText.split(/[。！？.!?]/).filter(s => s.trim().length > 5 && s.trim().length < 100)
    sentences.slice(0, 4).forEach((sentence, idx) => {
      if (sentence.trim()) {
        items.push({
          time: formatTimeFromMinute(idx * 3 + 1),
          description: sentence.trim(),
          answer: '详细内容请查看数据分析页面',
          isQA: true,
          questionNumber: idx + 1,
          isActive: idx === 0,
          jobId: jobId
        })
      }
    })
  }
  
  console.log(`解析出 ${items.length} 个问答项`)
  
  highlights.value = items.length > 0 ? items : [{
    time: '00:00',
    description: '当前视频尚未进行AI分析或暂无智能问答',
    isQA: true,
    questionNumber: 0,
    isActive: true,
    jobId: jobId,
    isEmpty: true
  }]
}

// 🎯 旧的fetchAIAnalyses函数保留用于兼容
const fetchAIAnalysesOld = async () => {
  try {
    const res = await axios.get(`${API_BASE}/api/tingwu/analyses`)
    if (res.data.success && res.data.data.length > 0) {
      const items = []
      
      for (const analysis of res.data.data) {
        try {
          const detailRes = await axios.get(`${API_BASE}/api/tingwu/analysis/${analysis.jobId}`)
          if (detailRes.data.success) {
            const detail = detailRes.data.data
            const rawSummaries = detail.rawSummaries || {}
            
            // 🎯 只解析智能问答 (QuestionsAnswering)
            if (rawSummaries.questionsAnswering && rawSummaries.questionsAnswering.length > 20) {
              const qaPattern = /\*\*Q(\d+):\s*([^*]+?)\*\*/g
              const answerPattern = /> 💡 \*\*答：\*\*\s*(.+?)(?=\n\*\*Q|$)/gs
              
              const questions = []
              let match
              while ((match = qaPattern.exec(rawSummaries.questionsAnswering)) !== null) {
                questions.push({ index: parseInt(match[1]), question: match[2].trim() })
              }
              
              const answers = []
              while ((match = answerPattern.exec(rawSummaries.questionsAnswering)) !== null) {
                answers.push(match[1].trim())
              }
              
              questions.slice(0, 4).forEach((q, idx) => {
                const answer = answers[idx] || '暂无答案'
                items.push({
                  time: formatTimeFromMinute(items.length * 3 + 6),
                  description: q.question.substring(0, 50) + (q.question.length > 50 ? '...' : ''),
                  tags: [{ name: `Q${q.index}`, type: 'decision' }, { name: '智能问答', type: 'qa' }],
                  speaker: '问答',
                  sentiment: 'neutral',
                  sentimentIcon: 'fas fa-question-circle',
                  isActive: false,
                  jobId: analysis.jobId,
                  answer: answer.substring(0, 80) + (answer.length > 80 ? '...' : ''),
                  isQA: true,
                  questionNumber: q.index
                })
              })
            }
            
            // 🎯 4. 如果有待办事项
            if (detail.actionItems && detail.actionItems.length > 0) {
              detail.actionItems.slice(0, 2).forEach((item, idx) => {
                const itemText = item.text || item.content || ''
                if (itemText.length > 5) {
                  items.push({
                    time: formatTimeFromMinute(items.length * 3 + 8),
                    description: `${itemText.substring(0, 60)}${itemText.length > 60 ? '...' : ''}`,
                    tags: [{ name: '待办事项', type: 'task' }],
                    speaker: item.owner || '待办',
                    sentiment: 'neutral',
                    sentimentIcon: 'fas fa-check-circle',
                    isActive: false,
                    jobId: analysis.jobId
                  })
                }
              })
            }
          }
        } catch (e) {
          console.warn(`获取分析详情失败: ${analysis.jobId}`, e)
        }
      }
      
      if (items.length > 0) {
        items.sort((a, b) => {
          const [ha, ma] = a.time.split(':').map(Number)
          const [hb, mb] = b.time.split(':').map(Number)
          return ha * 60 + ma - (hb * 60 + mb)
        })
        items[0].isActive = true
        highlights.value = items
      } else {
        highlights.value = getDefaultHighlights()
      }
    } else {
      highlights.value = getDefaultHighlights()
    }
  } catch (err) {
    console.error('获取 AI 分析列表失败:', err)
    highlights.value = getDefaultHighlights()
  }
}

// 根据分钟数生成时间格式
const formatTimeFromMinute = (minutes) => {
  const mins = Math.floor(minutes) % 60
  const hours = Math.floor(minutes / 60)
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

// 默认模拟数据
const getDefaultHighlights = () => [
  {
    time: '00:02',
    description: '开场介绍，主持人说明本次会议的主要议程。',
    tags: [{ name: '开场', type: 'data' }],
    speaker: '主持人',
    sentiment: 'positive',
    sentimentIcon: 'fas fa-microphone',
    isActive: true
  },
  {
    time: '00:07',
    description: '张经理汇报上季度产品运营数据，用户增长超预期。',
    tags: [{ name: '数据汇报', type: 'data' }],
    speaker: '张经理',
    sentiment: 'positive',
    sentimentIcon: 'fas fa-chart-bar',
    isActive: false
  },
  {
    time: '00:15',
    description: '李技术总监提出移动端适配方案，讨论技术实现细节。',
    tags: [{ name: '技术方案', type: 'tech' }],
    speaker: '李技术总监',
    sentiment: 'neutral',
    sentimentIcon: 'fas fa-code',
    isActive: false
  },
  {
    time: '00:20',
    description: '移动端适配需要多长时间完成？',
    tags: [{ name: 'Q1', type: 'decision' }, { name: '智能问答', type: 'qa' }],
    speaker: '问答',
    sentiment: 'neutral',
    sentimentIcon: 'fas fa-question-circle',
    isActive: false,
    answer: '预计需要三周左右，分为三个阶段完成。',
    isQA: true,
    questionNumber: 1
  },
  {
    time: '00:25',
    description: '讨论Q4预算分配，确定重点投入方向。',
    tags: [{ name: '预算', type: 'finance' }],
    speaker: '王总',
    sentiment: 'neutral',
    sentimentIcon: 'fas fa-wallet',
    isActive: false
  },
  {
    time: '00:33',
    description: '新版本发布时间确定了吗？',
    tags: [{ name: 'Q2', type: 'decision' }, { name: '智能问答', type: 'qa' }],
    speaker: '问答',
    sentiment: 'positive',
    sentimentIcon: 'fas fa-question-circle',
    isActive: false,
    answer: '确定在下月15号发布，各团队需提前准备。',
    isQA: true,
    questionNumber: 2
  },
  {
    time: '00:38',
    description: '确定待办事项：李技术负责开发，王产品收集反馈。',
    tags: [{ name: '待办事项', type: 'task' }],
    speaker: '主持人',
    sentiment: 'positive',
    sentimentIcon: 'fas fa-tasks',
    isActive: false
  },
  {
    time: '00:43',
    description: '陈测试组长说明测试计划，确保新版本质量。',
    tags: [{ name: '测试计划', type: 'task' }],
    speaker: '陈测试组长',
    sentiment: 'positive',
    sentimentIcon: 'fas fa-check-circle',
    isActive: false
  },
  {
    time: '00:48',
    description: '总结本次会议成果，确认各负责人任务。',
    tags: [{ name: '会议总结', type: 'summary' }],
    speaker: '主持人',
    sentiment: 'positive',
    sentimentIcon: 'fas fa-clipboard-check',
    isActive: false
  },
  {
    time: '00:55',
    description: '会议结束，感谢大家参与，期待下次会议。',
    tags: [{ name: '结束', type: 'summary' }],
    speaker: '主持人',
    sentiment: 'positive',
    sentimentIcon: 'fas fa-sign-out-alt',
    isActive: false
  }
]

// 选择关键帧，发送事件通知视频播放器跳转到对应时间
const selectHighlight = (highlight) => {
  highlights.value.forEach(item => {
    item.isActive = false
  })
  highlight.isActive = true
  
  // 发送事件通知父组件
  const event = new CustomEvent('highlight-select', {
    detail: { time: highlight.time, highlight: highlight },
    bubbles: true,
    composed: true
  })
  document.dispatchEvent(event)
  
  console.log('Selected highlight at:', highlight.time)
}

// 监听视频时间更新
const handleTimeUpdate = (e) => {
  currentTime.value = e.detail.time
  videoDuration.value = e.detail.duration || 600
  
  // 自动更新当前关键帧
  highlights.value.forEach((h, index) => {
    const [hh, mm] = h.time.split(':').map(Number)
    const highlightSeconds = hh * 3600 + mm * 60
    
    const [ch, cm] = currentTime.value.split(':').map(Number)
    const currentSeconds = ch * 3600 + cm * 60
    
    const nextHighlight = highlights.value[index + 1]
    let isCurrent = false
    
    if (nextHighlight) {
      const [nh, nm] = nextHighlight.time.split(':').map(Number)
      const nextSeconds = nh * 3600 + nm * 60
      isCurrent = currentSeconds >= highlightSeconds && currentSeconds < nextSeconds
    } else {
      isCurrent = currentSeconds >= highlightSeconds
    }
    
    h.isActive = isCurrent
  })
}

onMounted(() => {
  fetchAIAnalyses()
  document.addEventListener('video-time-update', handleTimeUpdate)
})

// 监听当前视频变化
watch(() => currentVideo.value?.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    console.log('视频切换:', currentVideo.value?.name || '未知视频')
    fetchAIAnalyses()
  }
})
</script>
REPLACE

<style scoped>
.right-column {
  background: linear-gradient(180deg, var(--bg-card) 0%, rgba(139, 92, 246, 0.03) 100%);
  border-radius: var(--radius-lg);
  padding: 1rem;
  border: 1px solid rgba(255,255,255,0.04);
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height) - 2rem);
  position: sticky;
  top: 1rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
  overflow: hidden;
  width: 320px;
}

.right-column::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary), var(--accent), var(--primary));
  opacity: 0.5;
}

.right-column:hover {
  box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 50px rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.15);
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  position: relative;
}

.column-header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
}

.column-title {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
}

.title-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.1rem;
  box-shadow: 0 4px 12px var(--primary-glow);
  animation: iconGlow 3s ease-in-out infinite;
}

@keyframes iconGlow {
  0%, 100% {
    box-shadow: 0 4px 12px var(--primary-glow);
  }
  50% {
    box-shadow: 0 6px 20px var(--primary-glow), 0 0 20px rgba(139, 92, 246, 0.3);
  }
}

.column-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 0.5rem 0.8rem;
  background: rgba(139, 92, 246, 0.08);
  border-radius: var(--radius-md);
  border: 1px solid rgba(139, 92, 246, 0.15);
}

.stats-number {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--primary);
  font-family: 'SF Mono', Monaco, monospace;
  text-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
}

.stats-label {
  font-size: 0.65rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.highlights-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding-right: 0.3rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 92, 246, 0.3) transparent;
}

.highlights-list::-webkit-scrollbar {
  width: 5px;
}

.highlights-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 3px;
}

.highlights-list::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--primary), var(--accent));
  border-radius: 3px;
}

.highlight-item {
  background: transparent;
  border-radius: 0;
  padding: 0.8rem 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: visible;
}

.highlight-item::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 3px;
  height: 60%;
  background: transparent;
  transform: translateY(-50%);
  border-radius: 0 3px 3px 0;
  transition: all 0.35s ease;
}

.highlight-item:hover {
  background: rgba(139, 92, 246, 0.05);
  padding-left: 0.5rem;
}

.highlight-item:hover::before {
  background: linear-gradient(180deg, var(--primary), var(--accent));
}

.highlight-item.active-highlight {
  background: rgba(0, 229, 255, 0.08);
  border-bottom-color: rgba(0, 229, 255, 0.2);
}

.highlight-item.active-highlight::before {
  background: linear-gradient(180deg, var(--accent), var(--primary));
  box-shadow: 0 0 12px var(--accent-glow);
}

.highlight-content {
  position: relative;
  z-index: 1;
}

.qa-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.qa-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.qa-number {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.65rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px var(--primary-glow);
}

.qa-time {
  font-size: 0.8rem;
  color: var(--accent);
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  background: rgba(6, 182, 212, 0.1);
  border-radius: 6px;
}

.qa-question {
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-main);
  padding: 0.6rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.hi-time i {
  font-size: 0.7rem;
  animation: pulse 2s infinite;
  color: var(--primary);
}

.current-badge {
  background: linear-gradient(135deg, var(--accent), var(--primary));
  color: white;
  font-size: 0.65rem;
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
  font-weight: 600;
  margin-left: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 229, 255, 0.4);
}

.action-button {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--text-dim);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.4rem;
  border-radius: var(--radius-sm);
  transition: all 0.3s ease;
  opacity: 0.6;
}

.highlight-item:hover .action-button {
  opacity: 1;
}

.action-button:hover {
  background: rgba(255,255,255,0.12);
  color: var(--text-main);
  border-color: rgba(255,255,255,0.15);
}

.hi-desc {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--text-main);
  margin-bottom: 0.8rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 🎯 智能问答特殊样式 */
.highlight-content.qa-content {
  background: rgba(0, 229, 255, 0.05);
  border: 1px solid rgba(0, 229, 255, 0.15);
}

.highlight-content.qa-content.active-highlight {
  background: linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(139, 92, 246, 0.08));
  border-color: var(--accent);
}

.qa-question {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.qa-number {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent);
  background: rgba(0, 229, 255, 0.15);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  flex-shrink: 0;
}

.qa-text {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-main);
}

.qa-answer {
  background: rgba(16, 185, 129, 0.08);
  border-left: 3px solid var(--success);
  padding: 0.6rem 0.8rem;
  margin-bottom: 0.6rem;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.qa-icon {
  font-size: 0.8rem;
  flex-shrink: 0;
}

.qa-answer-text {
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.hi-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag {
  font-size: 0.68rem;
  padding: 0.3rem 0.7rem;
  border-radius: 14px;
  background: rgba(255,255,255,0.06);
  color: var(--text-dim);
  border: 1px solid rgba(255,255,255,0.06);
  transition: all 0.3s ease;
}

.tag:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}

.tag.tech {
  background: rgba(139, 92, 246, 0.12);
  color: var(--primary);
  border-color: rgba(139, 92, 246, 0.25);
}

.tag.decision {
  background: rgba(0, 229, 255, 0.12);
  color: var(--accent);
  border-color: rgba(0, 229, 255, 0.25);
}

.tag.data {
  background: rgba(16, 185, 129, 0.12);
  color: var(--success);
  border-color: rgba(16, 185, 129, 0.25);
}

.tag.warning {
  background: rgba(245, 158, 11, 0.12);
  color: var(--warning);
  border-color: rgba(245, 158, 11, 0.25);
}

.tag.finance {
  background: rgba(236, 72, 153, 0.12);
  color: #ec4899;
  border-color: rgba(236, 72, 153, 0.25);
}

.tag.task {
  background: rgba(16, 185, 129, 0.12);
  color: var(--success);
  border-color: rgba(16, 185, 129, 0.25);
}

.tag.summary {
  background: rgba(139, 92, 246, 0.12);
  color: var(--primary);
  border-color: rgba(139, 92, 246, 0.25);
}

.highlight-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid rgba(255,255,255,0.04);
}

.speaker-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.speaker-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  box-shadow: 0 2px 8px var(--primary-glow);
}

.speaker-name {
  font-size: 0.78rem;
  color: var(--text-dim);
}

.sentiment-indicator {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  padding: 0.25rem 0.7rem;
  border-radius: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.sentiment-indicator:hover {
  transform: scale(1.05);
}

.sentiment-indicator.positive {
  background: rgba(16, 185, 129, 0.12);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.sentiment-indicator.negative {
  background: rgba(239, 68, 68, 0.12);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.sentiment-indicator.neutral {
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-muted);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}

/* 🎯 加载状态样式 */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-dim);
}

.loading-state .spinner {
  border: 3px solid rgba(139, 92, 246, 0.2);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 1s linear infinite;
  box-shadow: 0 0 20px var(--primary-glow);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state p {
  font-size: 0.9rem;
  color: var(--text-dim);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .right-column {
    position: static;
    height: auto;
    margin-top: 1.5rem;
  }
  
  .highlight-item {
    padding: 1rem;
  }
  
  .hi-desc {
    font-size: 0.9rem;
  }
}
</style>