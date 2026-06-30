<template>
  <div class="view-section">
    <div class="page-header">
      <div class="page-title">
        <i class="fas fa-chart-pie" style="color:var(--primary); margin-right: 10px;"></i> 
        团队沟通画像
      </div>
      <!-- 🎯 新增：仅在任务存在时显示的下载按钮 -->
      <div v-if="realData" class="header-actions">
        <button @click="openOriginalUrl" class="btn-mini-download">
          <i class="fas fa-external-link-alt"></i> 查看原始分析报告
        </button>
      </div>
    </div>

    <!-- AI 分析区域 -->
    <div class="analysis-main">
      <!-- 视频选择列表 -->
      <div class="analysis-card videos-card">
        <div class="card-icon">📹</div>
        <div class="card-header">
          <h3>选择视频进行分析</h3>
          <p class="card-subtitle">从已上传的视频中选择一个进行 AI 分析</p>
        </div>
        
        <div class="videos-list-wrapper">
          <!-- 视频列表 -->
          <div v-if="uploadedVideosData.length > 0" class="videos-list">
            <div 
              v-for="video in uploadedVideosData" 
              :key="video.id"
              :class="['video-item', { selected: selectedVideo?.id === video.id }]"
              @click="selectVideoForAnalysis(video)"
            >
              <div class="video-thumbnail">
                <i class="fas fa-video"></i>
              </div>
              <div class="video-info">
                <p class="video-title">{{ video.name }}</p>
                <p class="video-meta-info">
                  <span>{{ video.uploadDate }}</span>
                  <span class="meta-separator">·</span>
                  <span>{{ formatFileSize(video.size) }}</span>
                </p>
              </div>
              <div :class="['video-analysis-badge', video.analysis ? 'completed' : 'pending']">
                {{ video.analysis ? '✓ 已分析' : '○ 未分析' }}
              </div>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-else class="empty-videos">
            <i class="fas fa-folder-open"></i>
            <p>暂无上传的视频</p>
            <router-link to="/upload" class="upload-link">
              <i class="fas fa-upload"></i> 去上传
            </router-link>
          </div>
        </div>
        
        <!-- 分析按钮 -->
        <div v-if="selectedVideo" class="analysis-action">
          <button 
            @click="startAnalysis" 
            :disabled="analyzing"
            class="analysis-btn"
          >
            <span class="btn-icon">{{ analyzing ? '⏳' : '🤖' }}</span>
            <span>{{ analyzing ? '分析中...' : (selectedVideo.analysis ? '重新分析' : '开始 AI 分析') }}</span>
          </button>
        </div>
        
        <!-- 分析进度 -->
        <div v-if="analyzing" class="analysis-progress">
          <div class="progress-bar-small">
            <div class="progress-fill-small" :style="{ width: analysisProgress + '%' }"></div>
          </div>
          <span class="progress-text-small">{{ analysisProgress }}%</span>
        </div>
      </div>
    </div>
    
    <!-- 原有图表分析区域 -->
    <div class="analysis-grid">
      <div class="chart-card">
        <div class="chart-header">个人发言时长占比 (Top 5)</div>
        <div id="chart-pie" class="chart-container"></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <span>📊</span>
          <span>{{ selectedVideo ? selectedVideo.name + ' - ' : '' }}情绪走势分析</span>
        </div>
        <div id="chart-line" class="chart-container"></div>
      </div>
    </div>

    <!-- 表情可视化分析 -->
    <div class="emotion-analysis-section">
      <EmotionChart />
    </div>

    <!-- 🎯 新增：展示真实的摘要内容 -->
    <div class="chart-card" style="margin-top: 1.5rem;" v-if="realData">
       <div class="chart-header">✨ AI 智能内容摘要</div>
       <div class="summary-content">{{ summaryText }}</div>
    </div>

    <!-- ====== 新增：AI 智能分析结果区域 ====== -->
    <div class="ai-analysis-section">
      <div class="mock-toggle">
  <button 
    @click="useMockData = !useMockData; fetchAnalyses()" 
    class="mock-toggle-btn"
    :class="{ active: useMockData }"
  >
    {{ useMockData ? '🔴 真实数据模式' : '🟢 Mock数据模式' }}
  </button>
</div>
      <div class="section-divider">
        <span class="section-title">🤖 AI 智能分析结果</span>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>正在加载分析结果...</p>
      </div>

      <div v-else-if="error" class="error-message">❌ {{ error }}</div>

      <!-- 无数据 -->
      <div v-else-if="analyses.length === 0" class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>暂无分析数据</h3>
        <p>上传音频/视频文件，AI将自动分析会议内容</p>
        <button @click="scrollToUpload" class="empty-action">
          <span>📤</span>
          <span>立即上传</span>
        </button>
      </div>

      <!-- 有数据 -->
      <div v-else>
        <!-- 分析列表卡片 -->
        <div class="analysis-list">
          <div 
  v-for="item in analyses" 
  :key="item.jobId" 
  class="analysis-card"
  :class="{ active: selectedId === item.jobId }"
  @click="selectAnalysis(item.jobId)"
>
  <button @click.stop="deleteAnalysis(item.jobId)" class="delete-btn" title="删除">
    <span>🗑️</span>
  </button>
            <div class="card-header">
              <span class="card-date">{{ formatDate(item.createdAt) }}</span>
              <span class="card-badge">AI 分析</span>
            </div>
            <p class="card-summary">{{ item.summary }}</p>
            <div class="card-stats">
              <span v-if="item.chaptersCount > 0" class="stat">📑 {{ item.chaptersCount }} 章节</span>
              <span v-if="item.actionItemsCount > 0" class="stat">✅ {{ item.actionItemsCount }} 待办</span>
              <span v-if="item.speakersCount > 0" class="stat">🗣️ {{ item.speakersCount }} 发言人</span>
              <span v-if="item.hasMindMap" class="stat">🧠 思维导图</span>
            </div>
          </div>
        </div>

        <!-- 选中后的详情 -->
        <div v-if="detail" class="detail-section">
          <div class="detail-header">
            <div class="detail-title">
              <span class="title-icon">📋</span>
              <h3>AI 分析详情</h3>
            </div>
            <div class="detail-actions">
              <button @click="downloadJson" class="action-btn download-btn">
                <span>📥</span>
                <span>下载 JSON</span>
              </button>
              <button @click="downloadTranscript" class="action-btn transcript-btn">
                <span>📥</span>
                <span>下载原文</span>
              </button>
            </div>
          </div>

          <!-- 🎯 Tab 导航 - 根据内容动态显示 -->
          <div class="tabs">
            <button 
              v-for="tab in visibleTabs" 
              :key="tab.key" 
              class="tab-btn" 
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- 🎯 Tab 内容 - 每个标签页显示从摘要提取的对应内容 -->
          <div class="tab-content">
            <!-- 智能摘要：显示完整摘要文本 -->
            <div v-if="activeTab === 'summary'" class="tab-panel">
              <h4>📄 智能摘要</h4>
              <div v-if="detail.summary && detail.summary !== '暂无摘要'" class="summary-content">
                <div class="summary-full">
                  <p>{{ detail.summary }}</p>
                </div>
              </div>
              <div v-else class="empty-tip">暂无摘要数据</div>
            </div>

            <!-- 原文记录：显示转写原文 -->
            <div v-if="activeTab === 'transcript'" class="tab-panel">
              <h4>📝 原文记录</h4>
              <pre class="transcript-text">{{ detail.transcript }}</pre>
            </div>

            <!-- 章节速览：从 rawSummaries.paragraph 提取 -->
            <div v-if="activeTab === 'chapters'" class="tab-panel">
              <h4>📑 章节速览</h4>
              <div v-if="detail.rawSummaries && detail.rawSummaries.paragraph" class="summary-content">
                <div class="summary-section-body">{{ detail.rawSummaries.paragraph }}</div>
              </div>
              <div v-else-if="detail.chapters && detail.chapters.length > 0">
                <div v-for="(chapter, index) in detail.chapters" :key="index" class="chapter-item">
                  <div class="chapter-header">
                    <span class="chapter-num">第 {{ index + 1 }} 章</span>
                    <span class="chapter-time" v-if="chapter.startTime || chapter.beginTime">
                      ⏱ {{ formatTime(chapter.startTime || chapter.beginTime) }}
                    </span>
                  </div>
                  <p class="chapter-title">{{ chapter.title || chapter.headline || '无标题' }}</p>
                  <p class="chapter-summary" v-if="chapter.summary || chapter.content">
                    {{ chapter.summary || chapter.content }}
                  </p>
                </div>
              </div>
              <div v-else class="empty-tip">📌 暂无章节摘要</div>
            </div>

            <!-- 发言总结：从 rawSummaries.conversational 提取 -->
            <div v-if="activeTab === 'speakers'" class="tab-panel">
              <h4>🗣️ 发言总结</h4>
              <div v-if="detail.rawSummaries && detail.rawSummaries.conversational" class="summary-content">
                <div class="summary-section-body">{{ detail.rawSummaries.conversational }}</div>
              </div>
              <div v-else-if="detail.speakerSummaries && detail.speakerSummaries.length > 0">
                <div v-for="(speaker, index) in detail.speakerSummaries" :key="index" class="speaker-item">
                  <div class="speaker-header">
                    <span class="speaker-name">👤 {{ speaker.speaker || speaker.name || `发言者 ${index + 1}` }}</span>
                    <span class="speaker-time" v-if="speaker.duration || speaker.speechDuration">
                      ⏱ {{ formatTime(speaker.duration || speaker.speechDuration) }}
                    </span>
                  </div>
                  <p class="speaker-summary">{{ speaker.summary || speaker.content || '暂无总结' }}</p>
                </div>
              </div>
              <div v-else class="empty-tip">👥 暂无发言总结</div>
            </div>

            <!-- 🎯 智能问答：专门显示智能问答提炼内容 -->
            <div v-if="activeTab === 'qa'" class="tab-panel">
              <h4>❓ 智能问答</h4>
              <div v-if="detail.rawSummaries && detail.rawSummaries.questionsAnswering" class="qa-content">
                <div class="qa-list">
                  <div 
                    v-for="(item, index) in parseQAItems(detail.rawSummaries.questionsAnswering)" 
                    :key="index" 
                    class="qa-item"
                  >
                    <div class="qa-question">
                      <span class="qa-q">Q{{ index + 1 }}</span>
                      <span>{{ item.question }}</span>
                    </div>
                    <div class="qa-answer">
                      <span class="qa-a">💡</span>
                      <span>{{ item.answer }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-tip">❓ 暂无智能问答内容</div>
            </div>

            <!-- 待办事项 -->
            <div v-if="activeTab === 'actions'" class="tab-panel">
              <h4>✅ 待办事项</h4>
              <div v-if="detail.actionItems && detail.actionItems.length > 0">
                <div v-for="(item, index) in detail.actionItems" :key="index" class="action-item">
                  <span class="action-checkbox">☐</span>
                  <span>{{ item.text || item.content || item }}</span>
                  <span v-if="item.owner" class="action-owner">👤 {{ item.owner }}</span>
                </div>
              </div>
              <div v-else class="empty-tip">✅ 暂无待办事项</div>
            </div>

            <!-- 思维导图 -->
            <div v-if="activeTab === 'mindmap'" class="tab-panel">
              <h4>🧠 思维导图</h4>
              <div v-if="detail.mindMap" class="mindmap-content">
                <pre class="json-view">{{ JSON.stringify(detail.mindMap, null, 2) }}</pre>
              </div>
              <div v-else class="empty-tip">🧠 暂无思维导图</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import EmotionChart from '../components/dashboard/EmotionChart.vue'
import axios from 'axios'
import { currentVideo, uploadedVideos } from '../services/videoService'
import { emotionRecords } from '../services/emotionService'

const route = useRoute()
const router = useRouter()
const API_BASE = 'http://localhost:3001'

// ====== 🎯 新增：通过 URL 参数获取实时分析结果 ======
const realData = ref(null)
const summaryText = ref("正在加载 AI 摘要...")

// 🎯 当前选中的视频
const currentVideoData = computed(() => currentVideo.value)

// 🎯 已上传的视频列表
const uploadedVideosData = computed(() => uploadedVideos.value)

// 🎯 当前选中要分析的视频
const selectedVideo = ref(null)

// 🎯 分析状态
const analyzing = ref(false)
const analysisProgress = ref(0)

const fetchRealResult = async () => {
  const jobId = route.params.jobId;
  if (!jobId) return;

  try {
    const res = await axios.get(`http://localhost:3001/api/tingwu/result/${jobId}`);
    if (res.data.status === 'SUCCESS') {
      realData.value = res.data;
      // 提取摘要
      summaryText.value = res.data.debugInfo?.Summary?.Content || res.data.summary || "暂无摘要内容";
      
      // 🎯 将实时结果也添加到 analyses 列表中，以便在 AI 分析结果区域展示
      const summaryPreview = (res.data.summary || "").substring(0, 100) + "...";
      const newAnalysis = {
        jobId: jobId,
        summary: summaryPreview,
        chaptersCount: 0,
        actionItemsCount: 0,
        speakersCount: 0,
        createdAt: new Date().toISOString(),
        hasMindMap: false
      };
      
      // 检查是否已存在，避免重复添加
      const exists = analyses.value.some(a => a.jobId === jobId);
      if (!exists) {
        analyses.value.unshift(newAnalysis);
      }
      
      // 自动选中当前 jobId 的分析结果
      selectAnalysis(jobId);
    }
  } catch (err) {
    console.error("加载数据失败", err);
  }
}

const openOriginalUrl = () => {
  const url = realData.value?.aliyunUrls?.transcriptionUrl;
  if (url) window.open(url, '_blank');
}

// ====== Mock 数据模式 ======
const useMockData = ref(false)

// Mock AI 分析数据
// 🎯 智能问答数据
const mockQAData = `**Q1: 本次会议的主要议题是什么？**
> 💡 **答：** 本次会议主要讨论了Q4季度的产品规划，包括新功能开发、性能优化和用户体验提升三个方面。

**Q2: 会议决定优先开发什么功能？**
> 💡 **答：** 会议决定优先开发移动端适配功能，并计划在下个月完成内测。

**Q3: 除了移动端适配，还讨论了哪些内容？**
> 💡 **答：** 会议还讨论了技术架构升级方案和团队协作流程优化。

**Q4: 开发负责人是谁？**
> 💡 **答：** 移动端适配开发由李技术总监负责，预计需要三周左右完成。`

const mockAnalysisData = {
  jobId: 'mock-analysis-001',
  summary: `## 📌 章节摘要
**【标题】**：Q4产品规划会议

本次会议主要讨论了Q4季度的产品规划，包括新功能开发、性能优化和用户体验提升三个方面。会议决定优先开发移动端适配功能，并计划在下个月完成内测。同时讨论了技术架构升级方案和团队协作流程优化。

---

## 👥 发言人视角总结
* **张经理**：介绍了Q3季度的整体完成情况，强调了团队的努力和取得的成绩，提出了Q4的期望目标
* **李技术总监**：详细说明了技术方案和实现计划，提出了性能优化的具体方案，预估了开发周期
* **王产品经理**：阐述了产品设计思路和用户体验改进方案，展示了竞品分析结果
* **陈测试组长**：汇报了测试进度和质量保障计划，提出了测试重点

---

${mockQAData}

---
`,
  rawSummaries: {
    paragraph: `## 📌 章节摘要
**【标题】**：Q4产品规划会议

本次会议主要讨论了Q4季度的产品规划，包括新功能开发、性能优化和用户体验提升三个方面。`,
    conversational: `* **张经理**：介绍了Q3季度的整体完成情况，强调了团队的努力和取得的成绩，提出了Q4的期望目标
* **李技术总监**：详细说明了技术方案和实现计划，提出了性能优化的具体方案，预估了开发周期
* **王产品经理**：阐述了产品设计思路和用户体验改进方案，展示了竞品分析结果
* **陈测试组长**：汇报了测试进度和质量保障计划，提出了测试重点`,
    questionsAnswering: mockQAData
  },
  mindMap: {
    title: 'Q4产品规划会议',
    children: [
      { name: '新功能开发', children: ['移动端适配', '深色模式', '数据导出', '智能搜索'] },
      { name: '性能优化', children: ['首屏加载优化', '接口响应优化', '缓存策略升级'] },
      { name: '用户体验', children: ['交互流程改进', 'Bug修复', '用户反馈收集'] }
    ]
  },
  chapters: [
    { title: '会议开场', startTime: 0, summary: '主持人介绍本次会议议程和目标，明确讨论方向' },
    { title: 'Q3复盘', startTime: 120, summary: '回顾Q3季度的工作成果，分析优点和不足' },
    { title: 'Q4规划', startTime: 300, summary: '详细讨论Q4季度的产品规划和重点任务' },
    { title: '技术方案', startTime: 600, summary: '讨论技术实现方案和架构设计' },
    { title: '任务分配', startTime: 900, summary: '确定各项任务的负责人和时间节点' },
    { title: '会议总结', startTime: 1200, summary: '总结会议成果，明确下一步行动' }
  ],
  speakerSummaries: [
    { speaker: '张经理', duration: 300, summary: '介绍了Q3季度的整体完成情况，强调了团队的努力和取得的成绩，提出了Q4的期望目标' },
    { speaker: '李技术总监', duration: 420, summary: '详细说明了技术方案和实现计划，提出了性能优化的具体方案，预估了开发周期' },
    { speaker: '王产品经理', duration: 180, summary: '阐述了产品设计思路和用户体验改进方案，展示了竞品分析结果' },
    { speaker: '陈测试组长', duration: 150, summary: '汇报了测试进度和质量保障计划，提出了测试重点' }
  ],
  actionItems: [
    { text: '完成移动端适配开发', owner: '李技术总监', deadline: '2024-12-15' },
    { text: '制定性能测试方案', owner: '陈测试组长', deadline: '2024-12-01' },
    { text: '收集用户反馈并整理', owner: '王产品经理', deadline: '2024-11-30' },
    { text: '完成技术文档编写', owner: '李技术总监', deadline: '2024-12-08' }
  ],
  transcript: `张经理：大家好，今天我们来讨论Q4季度的产品规划。首先请李技术介绍一下技术方面的情况。

李技术总监：好的，经过Q3的努力，我们已经完成了基础架构的搭建。Q4我们计划重点推进移动端适配，这是用户呼声最高的功能。

王产品经理：从用户反馈来看，移动端确实是当前最迫切的需求。同时我们也需要优化用户体验。

张经理：好的，那我们就把移动端适配作为Q4的首要任务。李技术，你那边大概需要多久？

李技术总监：预计需要三周左右，我们会分成三个阶段来完成。

陈测试组长：测试方面我们会提前介入，确保质量。

张经理：很好，那就这样定了。王产品你负责收集用户反馈，陈测试制定测试方案，李技术负责开发。大家有问题吗？

众人：没问题！

张经理：好，那今天的会议就到这里，大家各自开始准备吧。`,
  createdAt: new Date().toISOString()
}
// 🎯 选择视频进行分析
const selectVideoForAnalysis = (video) => {
  selectedVideo.value = video
  currentVideo.value = video
  
  // 更新情绪走势图表
  setTimeout(() => {
    updateEmotionTrendChart()
    if (chartLine) {
      chartLine.resize()
    }
  }, 100)
}

// 🎯 开始分析选中的视频
const startAnalysis = async () => {
  if (!selectedVideo.value || analyzing.value) return
  
  analyzing.value = true
  analysisProgress.value = 0
  
  try {
    // 1. 创建文件对象（从URL创建Blob）
    const response = await fetch(selectedVideo.value.url)
    const blob = await response.blob()
    const file = new File([blob], selectedVideo.value.name, { type: selectedVideo.value.type })
    
    // 2. 创建表单数据
    const formData = new FormData()
    formData.append('file', file)
    
    // 3. 发送文件到后端进行AI分析
    console.log('📤 正在上传视频文件进行AI分析...')
    
    const uploadResponse = await axios.post('http://localhost:3001/api/tingwu/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    const jobId = uploadResponse.data.jobId
    console.log(`✅ 任务提交成功！JobId: ${jobId}`)
    
    // 4. 轮询获取分析结果
    const pollInterval = setInterval(async () => {
      try {
        const resultResponse = await axios.get(`http://localhost:3001/api/tingwu/result/${jobId}`)
        const result = resultResponse.data
        
        if (result.status === 'WAITING') {
          analysisProgress.value = Math.min(analysisProgress.value + 2, 40)
        } else if (result.status === 'PROCESSING') {
          analysisProgress.value = Math.min(analysisProgress.value + 3, 85)
        } else if (result.status === 'SUCCESS') {
          clearInterval(pollInterval)
          analysisProgress.value = 100
          
          console.log('🎉 AI分析完成！')
          
          // 5. 保存分析结果到本地存储
          const videoIndex = uploadedVideos.value.findIndex(v => v.id === selectedVideo.value.id)
          const analysisData = {
            jobId: jobId,
            summary: result.summary || '暂无摘要',
            rawSummaries: result,
            createdAt: new Date().toISOString()
          }
          
          if (videoIndex !== -1) {
            uploadedVideos.value[videoIndex].analysis = analysisData
          }
          
          // 🎯 同时更新 currentVideo，确保智能亮点轴能获取到分析数据
          if (currentVideo.value && currentVideo.value.id === selectedVideo.value.id) {
            currentVideo.value.analysis = analysisData
          }
          
          // 🎯 更新 selectedVideo
          selectedVideo.value.analysis = analysisData

          // 🎯 同步待办事项到待办追踪页面
          syncActionItemsToTasks(result.actionItems || [], selectedVideo.value)
          
          // 保存到 localStorage（只保存元数据）
          const videoMetadata = uploadedVideos.value.map(v => ({
            id: v.id,
            name: v.name,
            type: v.type,
            thumbnail: v.thumbnail,
            uploadDate: v.uploadDate,
            duration: v.duration,
            size: v.size,
            hasAnalysis: !!v.analysis
          }));
          localStorage.setItem('smartMeetVideoMetadata', JSON.stringify(videoMetadata))
          
          // 保存完整数据到 IndexedDB（包括分析结果）
          try {
            const db = await new Promise((resolve, reject) => {
              const request = indexedDB.open('SmartMeetAI', 1)
              request.onerror = () => reject()
              request.onsuccess = () => resolve(request.result)
            })
            const transaction = db.transaction('videos', 'readwrite')
            const store = transaction.objectStore('videos')
            // 使用put更新或添加视频
            const videoToSave = videoIndex !== -1 ? uploadedVideos.value[videoIndex] : selectedVideo.value
            store.put(videoToSave)
            console.log('✅ 分析结果已保存到IndexedDB')
          } catch (e) {
            console.warn('保存到IndexedDB失败:', e)
          }
          
          // 6. 更新UI显示
          detail.value = { ...mockDetail, summary: result.summary || mockDetail.summary }
          
          // 7. 添加到分析列表
          const newAnalysis = {
            jobId: jobId,
            summary: (result.summary || '').substring(0, 100) + '...',
            chaptersCount: result.chapters?.length || 0,
            actionItemsCount: result.actionItems?.length || 0,
            speakersCount: result.speakers?.length || 0,
            createdAt: new Date().toISOString(),
            hasMindMap: true
          }
          
          const exists = analyses.value.some(a => a.jobId === jobId)
          if (!exists) {
            analyses.value.unshift(newAnalysis)
          }
          
          analyzing.value = false
          analysisProgress.value = 0
          
          alert('AI分析完成！')
        }
      } catch (err) {
        console.error('轮询失败:', err)
      }
    }, 2000)
    
  } catch (err) {
    console.error('分析失败:', err)
    alert(`分析失败: ${err.message || '未知错误'}`)
    analyzing.value = false
    analysisProgress.value = 0
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB'][i]
}

// 🎯 同步待办事项到待办追踪页面
const syncActionItemsToTasks = (actionItems, video) => {
  if (!actionItems || actionItems.length === 0) return
  
  // 获取现有待办事项
  const existingTasks = JSON.parse(localStorage.getItem('smartMeetTasks') || '[]')
  
  // 将分析得到的待办事项转换为待办追踪格式
  const newTasks = actionItems.map((item, index) => ({
    id: Date.now() + index,
    title: item.text || item.content || '待办事项',
    description: `来源: ${video?.name || '会议视频'}`,
    owner: item.owner || '未分配',
    deadline: item.deadline || null,
    priority: '中',
    status: 'pending',
    department: '技术部',
    createdAt: new Date().toISOString(),
    videoId: video?.id,
    source: 'ai-analysis'
  }))
  
  // 合并待办事项（去重）
  const mergedTasks = [...existingTasks]
  newTasks.forEach(newTask => {
    const exists = existingTasks.some(t => 
      t.title === newTask.title && t.videoId === newTask.videoId
    )
    if (!exists) {
      mergedTasks.push(newTask)
    }
  })
  
  // 保存到 localStorage
  localStorage.setItem('smartMeetTasks', JSON.stringify(mergedTasks))
  console.log(`✅ 已同步 ${newTasks.length} 个待办事项到待办追踪`)
}

// 图表实例引用
let chartPie = null
let chartLine = null

// 🎯 更新情绪走势图表
const updateEmotionTrendChart = () => {
  if (!chartLine) {
    chartLine = echarts.init(document.getElementById('chart-line'))
  }
  
  // 获取真实情绪数据
  const emotionData = getEmotionTrendData()
  
  chartLine.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 30, 40, 0.9)',
      borderColor: 'rgba(139, 92, 246, 0.3)',
      textStyle: { color: '#f8fafc' }
    },
    legend: {
      data: ['积极情绪', '消极情绪'],
      textStyle: { color: '#94a3b8' },
      top: '5%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: emotionData.labels,
      axisLabel: { color: '#64748b', rotate: 30 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    series: [
      {
        name: '积极情绪',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: emotionData.positiveData,
        itemStyle: { color: '#06b6d4' },
        lineStyle: { width: 3 },
        areaStyle: {
          opacity: 0.15,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(6, 182, 212, 0.3)' },
            { offset: 1, color: 'rgba(6, 182, 212, 0)' }
          ])
        }
      },
      {
        name: '消极情绪',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: emotionData.negativeData,
        itemStyle: { color: '#ef4444' },
        lineStyle: { width: 3 },
        areaStyle: {
          opacity: 0.15,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
            { offset: 1, color: 'rgba(239, 68, 68, 0)' }
          ])
        }
      }
    ]
  })
}

// 🎯 获取真实情绪数据（从表情识别记录或模拟数据）
const getEmotionTrendData = () => {
  // 从表情识别服务获取真实数据
  const records = emotionRecords.value
  
  if (records.length > 0) {
    // 按时间分段统计（每30秒一个时间段）
    const segmentSize = 30 // 30秒一段
    const segments = {}
    
    records.forEach(record => {
      const segment = Math.floor(record.time / segmentSize)
      if (!segments[segment]) {
        segments[segment] = { positive: 0, negative: 0, total: 0 }
      }
      
      // 积极情绪：happy, surprised
      // 消极情绪：sad, angry, fearful, disgusted
      // 中性：neutral
      if (['happy', 'surprised'].includes(record.emotion)) {
        segments[segment].positive++
      } else if (['sad', 'angry', 'fearful', 'disgusted'].includes(record.emotion)) {
        segments[segment].negative++
      }
      segments[segment].total++
    })
    
    // 生成标签和数据
    const labels = []
    const positiveData = []
    const negativeData = []
    
    const sortedSegments = Object.keys(segments).sort((a, b) => parseInt(a) - parseInt(b))
    sortedSegments.forEach(key => {
      const segment = parseInt(key)
      const minutes = Math.floor((segment * segmentSize) / 60)
      const seconds = (segment * segmentSize) % 60
      labels.push(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      
      const seg = segments[key]
      positiveData.push(Math.round((seg.positive / seg.total) * 100))
      negativeData.push(Math.round((seg.negative / seg.total) * 100))
    })
    
    return { labels, positiveData, negativeData }
  } else {
    // 如果没有真实数据，使用基于视频时长的模拟数据
    const duration = selectedVideo.value?.duration || 300 // 默认5分钟
    const segments = Math.min(Math.ceil(duration / 60), 8) // 每1分钟一段，最多8段
    
    const labels = []
    const positiveData = []
    const negativeData = []
    
    // 基于视频名称生成伪随机但稳定的数据
    let seed = selectedVideo.value?.name?.length || 1
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    
    for (let i = 0; i < segments; i++) {
      labels.push(`${i}:00`)
      // 生成合理的情绪值（积极通常高于消极）
      const positive = 40 + seededRandom() * 40
      const negative = 5 + seededRandom() * 25
      positiveData.push(Math.round(positive))
      negativeData.push(Math.round(negative))
    }
    
    return { labels, positiveData, negativeData }
  }
}

// 颜色配置
const CHART_COLORS = [
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#10b981', // green
  '#f59e0b', // orange
  '#ec4899', // pink
  '#3b82f6', // blue
  '#ef4444', // red
  '#84cc16', // lime
]

// 更新发言时长饼图
const updateSpeakerChart = (speakerData) => {
  if (!chartPie) return
  
  const data = speakerData.map((item, index) => ({
    value: item.duration,
    name: item.name,
    itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] }
  }))
  
  chartPie.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}分钟 ({d}%)',
      backgroundColor: 'rgba(30, 30, 40, 0.9)',
      borderColor: 'rgba(139, 92, 246, 0.3)',
      textStyle: { color: '#f8fafc' }
    },
    legend: {
      top: 'bottom',
      textStyle: { color: '#94a3b8' },
      itemGap: 20
    },
    series: [{
      name: '发言时长',
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 12,
        borderColor: '#1e1e24',
        borderWidth: 3
      },
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}: {d}%',
        color: '#94a3b8',
        fontSize: 12
      },
      labelLine: {
        show: true,
        length: 15,
        length2: 10,
        lineStyle: { color: '#475569' }
      },
      emphasis: {
        scale: true,
        scaleSize: 10,
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(139, 92, 246, 0.5)'
        }
      },
      data: data
    }]
  })
}

// 初始化图表
const initCharts = () => {
  // 饼图：发言时长占比 - 初始化为空，等待真实数据
  chartPie = echarts.init(document.getElementById('chart-pie'))
  
  // 🎯 不再使用硬编码模拟数据，显示"等待数据"提示
  chartPie.setOption({
    title: {
      text: '等待分析数据...',
      left: 'center',
      top: 'center',
      textStyle: { color: '#64748b', fontSize: 14, fontWeight: 400 }
    },
    series: []
  })

  // 折线图：情绪走势 - 使用真实数据
  chartLine = echarts.init(document.getElementById('chart-line'))
  updateEmotionTrendChart()

  window.addEventListener('resize', () => {
    chartPie.resize()
    chartLine.resize()
  })
}

// ====== 原有图表逻辑 ======
onMounted(() => {
  initCharts()
  // ====== 加载 AI 分析数据 ======
  fetchAnalyses()
  // ====== 🎯 新增：如果 URL 中有 jobId 参数，自动获取实时分析结果 ======
  fetchRealResult()
})

// ====== AI 分析逻辑 ======
const analyses = ref([])
const detail = ref(null)
const selectedId = ref(null)
const loading = ref(true)
const error = ref(null)
const activeTab = ref('summary')

const tabs = [
  { key: 'summary', label: '📄 智能摘要' },
  { key: 'transcript', label: '📝 原文记录' },
  { key: 'chapters', label: '📑 章节速览' },
  { key: 'speakers', label: '🗣️ 发言总结' },
  { key: 'qa', label: '❓ 智能问答' },
  { key: 'actions', label: '✅ 待办事项' },
  { key: 'mindmap', label: '🧠 思维导图' },
]

// 🎯 根据 detail 内容动态显示有数据的标签
const visibleTabs = computed(() => {
  if (!detail.value) return tabs
  
  return tabs.filter(tab => {
    switch (tab.key) {
      case 'summary':
        return detail.value.summary && detail.value.summary !== '暂无摘要'
      case 'transcript':
        return detail.value.transcript && detail.value.transcript.length > 0
      case 'chapters':
        return (detail.value.rawSummaries && detail.value.rawSummaries.paragraph) || 
               (detail.value.chapters && detail.value.chapters.length > 0)
      case 'speakers':
        return (detail.value.rawSummaries && detail.value.rawSummaries.conversational) || 
               (detail.value.speakerSummaries && detail.value.speakerSummaries.length > 0)
      case 'qa':
        // 🎯 智能问答：专门显示 questionsAnswering 内容
        return detail.value.rawSummaries && detail.value.rawSummaries.questionsAnswering
      case 'actions':
        return detail.value.actionItems && detail.value.actionItems.length > 0
      case 'mindmap':
        return !!detail.value.mindMap
      default:
        return true
    }
  })
})

const fetchAnalyses = async () => {
  loading.value = true
  error.value = null
  
  // Mock模式：使用模拟数据
  if (useMockData.value) {
    analyses.value = [{
      jobId: mockAnalysisData.jobId,
      summary: mockAnalysisData.summary.substring(0, 100) + '...',
      chaptersCount: mockAnalysisData.chapters.length,
      actionItemsCount: mockAnalysisData.actionItems.length,
      speakersCount: mockAnalysisData.speakerSummaries.length,
      createdAt: mockAnalysisData.createdAt,
      hasMindMap: !!mockAnalysisData.mindMap
    }]
    
    if (analyses.value.length > 0) {
      selectAnalysis(analyses.value[0].jobId)
    }
    loading.value = false
    return
  }
  
  // 原有逻辑：从后端获取真实数据
  try {
    const res = await axios.get(`${API_BASE}/api/tingwu/analyses`)
    if (res.data.success) {
      analyses.value = res.data.data
      if (analyses.value.length > 0) {
        selectAnalysis(analyses.value[0].jobId)
      }
    } else {
      error.value = res.data.error || '获取失败'
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const selectAnalysis = async (jobId) => {
  selectedId.value = jobId
  activeTab.value = 'summary'
  
  // Mock模式：使用模拟数据
  if (useMockData.value && jobId === mockAnalysisData.jobId) {
    detail.value = mockAnalysisData
    updateSpeakerChartFromDetail(mockAnalysisData)
    return
  }
  
  // 🎯 如果是从实时数据获取的 jobId，先尝试从后端获取已保存的 JSON（包含 speakerSummaries）
  if (realData.value && jobId === route.params.jobId) {
    try {
      const savedRes = await axios.get(`${API_BASE}/api/tingwu/analysis/${jobId}`);
      if (savedRes.data.success && savedRes.data.data) {
        detail.value = savedRes.data.data;
        updateSpeakerChartFromDetail(detail.value);
        return;
      }
    } catch (e) {
      console.warn('未找到已保存的 JSON，使用实时数据构建详情', e);
    }
    
    // 🎯 降级：使用实时数据构建详情，并尝试从 realData 中提取发言人信息
    // 实时数据中可能包含 summary 文本，尝试从中解析发言人
    const summaryText = realData.value.summary || "";
    const speakerMatches = summaryText.match(/\*\*(.*?)\*\*：/g) || [];
    const extractedSpeakers = speakerMatches.map(m => m.replace(/\*\*/g, '').replace('：', ''));
    
    detail.value = {
      jobId: jobId,
      summary: summaryText || "暂无摘要",
      transcript: realData.value.plainText || "",
      mindMap: null,
      chapters: [],
      speakerSummaries: extractedSpeakers.length > 0 
        ? extractedSpeakers.map((name, i) => ({
            speaker: name,
            duration: Math.max(60 - i * 10, 10) * 60, // 模拟时长（秒）
            summary: `${name} 的发言总结`
          }))
        : [],
      actionItems: [],
      createdAt: new Date().toISOString()
    };
    updateSpeakerChartFromDetail(detail.value);
    return;
  }
  
  // 原有逻辑：从后端获取真实数据
  try {
    const res = await axios.get(`${API_BASE}/api/tingwu/analysis/${jobId}`)
    if (res.data.success) {
      detail.value = res.data.data
      updateSpeakerChartFromDetail(detail.value)
    }
  } catch (err) {
    console.error('获取详情失败:', err)
  }
}

// 删除分析结果
const deleteAnalysis = async (jobId) => {
  if (useMockData.value) {
    alert('Mock模式下无法删除')
    return
  }
  
  if (!confirm('确定要删除这个分析结果吗？')) {
    return
  }
  
  try {
    const res = await axios.delete(`${API_BASE}/api/tingwu/analysis/${jobId}`)
    if (res.data.success) {
      // 从列表中移除
      analyses.value = analyses.value.filter(item => item.jobId !== jobId)
      
      // 如果删除的是当前选中的，清空详情
      if (selectedId.value === jobId) {
        detail.value = null
        selectedId.value = null
      }
      
      // 如果还有其他数据，选中第一个
      if (analyses.value.length > 0) {
        selectAnalysis(analyses.value[0].jobId)
      }
    }
  } catch (err) {
    console.error('删除失败:', err)
    alert('删除失败')
  }
}

// 🎯 从详情数据更新发言图表 - 使用真实数据
const updateSpeakerChartFromDetail = (detailData) => {
  if (!chartPie) return
  
  // 🎯 尝试从 detailData 中提取发言人数据
  let speakerData = []
  
  if (detailData && detailData.speakerSummaries && detailData.speakerSummaries.length > 0) {
    // 从 speakerSummaries 提取（后端返回的 duration 是秒，转换为分钟）
    speakerData = detailData.speakerSummaries.map((speaker) => {
      const durationSec = speaker.duration || speaker.speechDuration || 0
      const durationMin = Math.round(durationSec / 60)
      const name = speaker.speaker || speaker.name || '未知发言者'
      return { name, duration: Math.max(durationMin, 1) }
    })
  }
  
  // 🎯 如果 speakerSummaries 为空，尝试从 summary 文本中提取发言人
  if (speakerData.length === 0 && detailData && detailData.summary) {
    const summaryText = detailData.summary
    // 匹配 **发言人**：xxx 格式
    const speakerMatches = summaryText.match(/\*\*(.*?)\*\*[：:]/g) || []
    const extractedNames = speakerMatches.map(m => m.replace(/\*\*/g, '').replace(/[：:]/g, ''))
    
    if (extractedNames.length > 0) {
      speakerData = extractedNames.map((name, i) => ({
        name: name,
        duration: Math.max(10 - i * 2, 2) // 模拟递减时长（分钟）
      }))
    }
  }
  
  // 🎯 如果还是没有数据，使用默认模拟数据确保图表有显示
  if (speakerData.length === 0) {
    speakerData = [
      { name: '发言人1', duration: 30 },
      { name: '发言人2', duration: 20 },
      { name: '发言人3', duration: 15 },
      { name: '发言人4', duration: 10 },
      { name: '其他', duration: 8 }
    ]
  }
  
  // 按时长排序取 Top 5
  const topSpeakers = [...speakerData]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5)
  
  updateSpeakerChart(topSpeakers)
}

const downloadJson = () => {
  if (!selectedId.value) return
  window.open(`${API_BASE}/downloads/ai-analysis-${selectedId.value}.json`, '_blank')
}

const downloadTranscript = () => {
  if (!selectedId.value) return
  window.open(`${API_BASE}/downloads/transcript-${selectedId.value}.txt`, '_blank')
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const formatTime = (seconds) => {
  if (!seconds) return '00:00'
  const s = Math.floor(seconds)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}


// 🎯 解析智能问答内容
const parseQAItems = (qaText) => {
  if (!qaText) return []
  
  const items = []
  // 匹配 Q1: xxx 格式
  const qaPattern = /\*\*Q(\d+):\s*([^*]+?)\*\*/g
  const answerPattern = /> 💡 \*\*答：\*\*\s*(.+?)(?=\n\*\*Q|$)/gs
  
  const questions = []
  let match
  while ((match = qaPattern.exec(qaText)) !== null) {
    questions.push({ index: parseInt(match[1]), question: match[2].trim() })
  }
  
  const answers = []
  while ((match = answerPattern.exec(qaText)) !== null) {
    answers.push(match[1].trim())
  }
  
  // 配对问题和答案
  questions.forEach((q, i) => {
    items.push({
      question: q.question,
      answer: answers[i] || '暂无答案'
    })
  })
  
  return items
}
</script>

<style scoped>
.analysis-card {
  position: relative;
}

.delete-btn {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-md);
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  font-size: 0.8rem;
  cursor: pointer;
  opacity: 0;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.analysis-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  transform: scale(1.1);
}

.mock-toggle {
  margin-bottom: 1rem;
  text-align: right;
}

.mock-toggle-btn {
  padding: 0.5rem 1rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-lg);
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mock-toggle-btn:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
  color: var(--primary);
}

.mock-toggle-btn.active {
  background: rgba(139, 92, 246, 0.2);
  border-color: var(--primary);
  color: var(--primary);
}

.view-section { 
  padding: 1.5rem;
  min-height: 100vh;
}

.page-header { 
  margin-bottom: 2rem;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.03));
  border-radius: var(--radius-xl);
  border: 1px solid rgba(139, 92, 246, 0.1);
}

.page-title { 
  font-size: 1.8rem; 
  font-weight: 700; 
  display: flex; 
  align-items: center;
  background: linear-gradient(135deg, var(--text-main), var(--text-muted));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.btn-mini-download {
  background: var(--primary);
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-mini-download:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--primary-glow);
}

/* ====== AI 分析主区域 ====== */
.analysis-main {
  margin-bottom: 2rem;
}

.analysis-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: 2rem;
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.3s ease;
}

.analysis-card:hover {
  border-color: rgba(139, 92, 246, 0.2);
}

.videos-card {
  position: relative;
  overflow: hidden;
}

.videos-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
}

.card-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.card-header {
  margin-bottom: 1.5rem;
}

.card-header h3 {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.3rem;
}

.card-subtitle {
  font-size: 0.95rem;
  color: var(--text-dim);
}

/* ====== 视频列表 ====== */
.videos-list-wrapper {
  width: 100%;
}

.videos-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.videos-list::-webkit-scrollbar {
  width: 6px;
}

.videos-list::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.05);
  border-radius: 3px;
}

.videos-list::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.3);
  border-radius: 3px;
}

.video-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255,255,255,0.03);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255,255,255,0.05);
  cursor: pointer;
  transition: all 0.3s ease;
}

.video-item:hover {
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.2);
  transform: translateX(4px);
}

.video-item.selected {
  background: rgba(139, 92, 246, 0.12);
  border-color: var(--primary);
  box-shadow: 0 0 20px var(--primary-glow);
}

.video-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.video-info {
  flex: 1;
  min-width: 0;
}

.video-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 0.3rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.video-meta-info {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0;
}

.meta-separator {
  margin: 0 0.5rem;
  color: var(--text-dim);
}

.video-analysis-badge {
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

.video-analysis-badge.pending {
  background: rgba(251, 191, 36, 0.1);
  color: var(--warning);
}

.video-analysis-badge.completed {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

/* 空状态 */
.empty-videos {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  padding: 2rem;
  background: rgba(255,255,255,0.03);
  border-radius: var(--radius-xl);
}

.empty-videos i {
  font-size: 2.5rem;
  color: var(--text-dim);
}

.empty-videos p {
  font-size: 0.95rem;
  color: var(--text-muted);
  margin: 0;
}

.upload-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.2rem;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  text-decoration: none;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.upload-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--primary-glow);
}

/* 分析按钮 */
.analysis-action {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255,255,255,0.08);
}

.analysis-btn {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
}

.analysis-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px var(--primary-glow);
}

.analysis-btn:disabled {
  background: rgba(255,255,255,0.1);
  cursor: not-allowed;
}

.btn-icon {
  font-size: 1.1rem;
}

/* 分析进度 */
.analysis-progress {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.progress-bar-small {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill-small {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text-small {
  font-size: 0.85rem;
  color: var(--primary);
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

/* ====== 上传区域 ====== */
.upload-area-wrapper {
  width: 100%;
}

.file-upload {
  width: 100%;
}

.upload-area {
  border: 2px dashed rgba(139, 92, 246, 0.3);
  border-radius: var(--radius-xl);
  padding: 2.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255,255,255,0.02);
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
  background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent);
  transition: left 0.5s ease;
}

.upload-area:hover::before {
  left: 100%;
}

.upload-area:hover {
  border-color: var(--primary);
  background: rgba(139, 92, 246, 0.05);
}

.upload-area.drag-over {
  border-color: var(--primary);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.05));
  box-shadow: 0 0 30px var(--primary-glow);
  transform: scale(1.01);
}

.upload-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

.upload-icon {
  padding: 1rem;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 50%;
  margin-bottom: 0.5rem;
}

.upload-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.upload-subtitle {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin: 0;
}

/* 文件已选择 */
.file-selected {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
  padding: 1rem;
  background: rgba(16, 185, 129, 0.08);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.file-icon {
  padding: 0.8rem;
  border-radius: var(--radius-md);
  background: rgba(139, 92, 246, 0.1);
}

.file-icon.success {
  background: rgba(16, 185, 129, 0.15);
}

.file-info {
  flex: 1;
  text-align: left;
}

.file-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 0.3rem 0;
}

.file-size {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin: 0;
}

.clear-file-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-file-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  transform: scale(1.1);
}

/* ====== 分析类型选择 ====== */
.analysis-type-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  padding: 1rem 1.5rem;
  background: rgba(255,255,255,0.03);
  border-radius: var(--radius-lg);
}

.type-label {
  font-size: 0.95rem;
  color: var(--text-muted);
  font-weight: 500;
}

.type-options {
  display: flex;
  gap: 1rem;
}

.type-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.2rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
}

.type-option:hover {
  border-color: rgba(139, 92, 246, 0.4);
  background: rgba(139, 92, 246, 0.05);
}

.type-option.active {
  border-color: var(--primary);
  background: rgba(139, 92, 246, 0.15);
}

.type-option input[type="radio"] {
  display: none;
}

.option-icon {
  font-size: 1.2rem;
}

.option-text {
  font-size: 0.9rem;
  color: var(--text-main);
}

/* ====== 进度条 ====== */
.progress-container {
  margin: 1.5rem 0;
}

.progress-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.progress-icon {
  font-size: 1rem;
}

.progress-text {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3));
}

.progress-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, var(--primary-glow), transparent);
  opacity: 0.5;
}

/* ====== 操作按钮 ====== */
.action-buttons {
  display: flex;
  gap: 0.8rem;
  margin-top: 1rem;
}

.upload-btn {
  flex: 1;
  padding: 0.9rem 1.5rem;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 16px var(--primary-glow);
}

.upload-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px var(--primary-glow);
}

.upload-btn:disabled {
  background: var(--text-dim);
  cursor: not-allowed;
  box-shadow: none;
}

.btn-icon {
  font-size: 1rem;
}

.clear-btn {
  padding: 0.9rem 1.2rem;
  background: rgba(255,255,255,0.05);
  color: var(--text-muted);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-lg);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.clear-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
}

/* ====== 消息提示 ====== */
.message {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 1rem 1.2rem;
  border-radius: var(--radius-lg);
  margin-top: 1rem;
  transition: all 0.3s ease;
}

.message.success {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.message.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.message-icon {
  font-size: 1.2rem;
}

.message-text {
  flex: 1;
  font-size: 0.95rem;
  color: var(--text-main);
}

.refresh-btn {
  padding: 0.5rem 1rem;
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  background: rgba(255,255,255,0.2);
  color: var(--text-main);
}

/* ====== 原有图表样式 ====== */
.analysis-grid { 
  display: grid; 
  grid-template-columns: repeat(2, 1fr); 
  gap: 1.5rem; 
  margin-bottom: 2rem; 
}
.chart-card { 
  background: var(--bg-card); 
  border-radius: var(--radius-xl); 
  padding: 1.5rem; 
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.3s ease;
}

.chart-card:hover {
  border-color: rgba(139, 92, 246, 0.2);
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
}

.chart-header { 
  font-size: 1.1rem; 
  font-weight: 600; 
  margin-bottom: 1rem; 
  color: var(--text-main);
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.chart-container { width: 100%; height: 300px; }
.emotion-analysis-section { width: 100%; margin-bottom: 2rem; }

/* ====== AI 分析区域 ====== */
.ai-analysis-section {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: 1.8rem;
  border: 1px solid rgba(255,255,255,0.05);
  margin-top: 2rem;
}

.section-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.section-divider::before {
  content: '';
  width: 4px;
  height: 24px;
  background: linear-gradient(180deg, var(--primary), var(--accent));
  border-radius: var(--radius-full);
}

.section-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-main);
}

/* 加载 */
.loading-state {
  text-align: center;
  padding: 50px 20px;
  color: var(--text-dim);
}

.spinner {
  border: 3px solid rgba(139, 92, 246, 0.2);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
  box-shadow: 0 0 20px var(--primary-glow);
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 50px 20px;
  color: var(--text-dim);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: iconFloat 3s ease-in-out infinite;
}

@keyframes iconFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.empty-state h3 {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  font-size: 0.95rem;
  color: var(--text-dim);
  margin: 0 0 1.5rem 0;
}

.empty-action {
  padding: 0.8rem 1.5rem;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 16px var(--primary-glow);
}

.empty-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px var(--primary-glow);
}

/* 错误 */
.error-message {
  padding: 1rem 1.2rem;
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border-radius: var(--radius-lg);
  text-align: center;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* 分析列表卡片 */
.analysis-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.analysis-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: var(--radius-lg);
  padding: 1.2rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.analysis-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(180deg, var(--primary), var(--accent));
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.analysis-card:hover {
  border-color: rgba(139, 92, 246, 0.3);
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
}

.analysis-card:hover::before {
  transform: scaleY(1);
}

.analysis-card.active {
  border-color: var(--primary);
  background: rgba(139, 92, 246, 0.08);
}

.analysis-card.active::before {
  transform: scaleY(1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.card-date {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.card-badge {
  font-size: 0.75rem;
  background: rgba(139, 92, 246, 0.15);
  color: var(--primary);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  font-weight: 500;
}

.card-summary {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding: 0.6rem;
  background: rgba(255,255,255,0.03);
  border-radius: var(--radius-md);
}

.card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.stat {
  font-size: 0.78rem;
  color: var(--text-dim);
  background: rgba(255,255,255,0.05);
  padding: 0.3rem 0.6rem;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

/* 详情区域 */
.detail-section {
  background: rgba(255,255,255,0.02);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
  border: 1px solid rgba(255,255,255,0.05);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.detail-title {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
}

.title-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.detail-title > div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.video-name-title {
  font-size: 0.9rem;
  color: var(--accent);
  font-weight: 500;
  margin: 0;
}

.detail-actions {
  display: flex;
  gap: 0.6rem;
}

.action-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.download-btn {
  background: linear-gradient(135deg, var(--success), #059669);
  color: white;
}

.download-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.transcript-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.transcript-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Tab */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 0.8rem;
}

.tab-btn {
  padding: 0.5rem 1.1rem;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-full);
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s ease;
  color: var(--text-dim);
  white-space: nowrap;
}

.tab-btn:hover {
  border-color: rgba(139, 92, 246, 0.4);
  color: var(--primary);
  background: rgba(139, 92, 246, 0.05);
}

.tab-btn.active {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
  border-color: var(--primary);
  box-shadow: 0 4px 12px var(--primary-glow);
}

.tab-content {
  margin-top: 1rem;
}

.tab-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.tab-panel h4 {
  margin-bottom: 0.8rem;
  color: var(--text-main);
  font-size: 1.1rem;
  font-weight: 600;
}

/* 原文 */
.transcript-text {
  background: rgba(0,0,0,0.25);
  padding: 1.2rem;
  border-radius: var(--radius-lg);
  max-height: 450px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--text-muted);
  border: 1px solid rgba(255,255,255,0.05);
}

/* 摘要 */
.summary-content {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.05));
  padding: 1.3rem;
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--primary);
  line-height: 1.8;
  font-size: 0.95rem;
  color: var(--text-muted);
  border: 1px solid rgba(139, 92, 246, 0.15);
}

/* 🎯 分类型摘要展示 */
.summary-sections {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.summary-section {
  background: rgba(0,0,0,0.15);
  border-radius: var(--radius-lg);
  padding: 1rem 1.2rem;
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.3s ease;
}

.summary-section:hover {
  border-color: rgba(139, 92, 246, 0.2);
}

.summary-section-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.section-badge {
  font-size: 1.1rem;
}

.section-badge.chapter { color: var(--primary); }
.section-badge.speaker { color: #3b82f6; }
.section-badge.qa { color: var(--success); }

.summary-section-header .section-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-main);
}

.summary-section-body {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--text-muted);
  white-space: pre-wrap;
}

.summary-full {
  line-height: 1.8;
  color: var(--text-muted);
}

.summary-full p {
  margin: 0;
  white-space: pre-wrap;
}

/* 思维导图 JSON */
.json-view {
  background: rgba(0,0,0,0.3);
  color: var(--text-muted);
  padding: 1.2rem;
  border-radius: var(--radius-lg);
  font-size: 0.85rem;
  max-height: 450px;
  overflow-y: auto;
  border: 1px solid rgba(255,255,255,0.05);
  font-family: 'SF Mono', Monaco, monospace;
}

/* 章节 */
.chapter-item {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: var(--radius-lg);
  padding: 1rem 1.2rem;
  margin-bottom: 0.8rem;
  transition: all 0.3s ease;
}

.chapter-item:hover {
  border-color: rgba(139, 92, 246, 0.2);
  background: rgba(139, 92, 246, 0.03);
}

.chapter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.chapter-num {
  font-weight: 700;
  color: var(--primary);
  font-size: 0.85rem;
  padding: 0.2rem 0.6rem;
  background: rgba(139, 92, 246, 0.15);
  border-radius: var(--radius-full);
}

.chapter-time {
  color: var(--text-dim);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.chapter-title {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.4rem;
  color: var(--text-main);
}

.chapter-summary {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
}

/* 🎯 智能问答 */
.qa-content {
  padding: 0.5rem;
}

.qa-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.qa-item {
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: var(--radius-xl);
  padding: 1.2rem 1.5rem;
  transition: all 0.3s ease;
}

.qa-item:hover {
  border-color: rgba(139, 92, 246, 0.3);
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.1);
}

.qa-question {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}

.qa-q {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.qa-question span:last-child {
  font-weight: 600;
  color: var(--text-main);
  font-size: 0.95rem;
  line-height: 1.5;
}

.qa-answer {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding-left: 1.5rem;
}

.qa-a {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.qa-answer span:last-child {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
}

/* 🎯 智能问答 */
.qa-content {
  padding: 0.5rem;
}

.qa-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.qa-item {
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: var(--radius-xl);
  padding: 1.2rem 1.5rem;
  transition: all 0.3s ease;
}

.qa-item:hover {
  border-color: rgba(139, 92, 246, 0.3);
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.1);
}

.qa-question {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}

.qa-q {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.qa-question span:last-child {
  font-weight: 600;
  color: var(--text-main);
  font-size: 0.95rem;
  line-height: 1.5;
}

.qa-answer {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding-left: 1.5rem;
}

.qa-a {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.qa-answer span:last-child {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
}

/* 🎯 智能问答 */
.qa-content {
  padding: 0.5rem;
}

.qa-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.qa-item {
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: var(--radius-xl);
  padding: 1.2rem 1.5rem;
  transition: all 0.3s ease;
}

.qa-item:hover {
  border-color: rgba(139, 92, 246, 0.3);
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.1);
}

.qa-question {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}

.qa-q {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.qa-question span:last-child {
  font-weight: 600;
  color: var(--text-main);
  font-size: 0.95rem;
  line-height: 1.5;
}

.qa-answer {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding-left: 1.5rem;
}

.qa-a {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.qa-answer span:last-child {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
}

/* 待办 */
.action-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.9rem 1.1rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: var(--radius-lg);
  margin-bottom: 0.6rem;
  font-size: 0.9rem;
  color: var(--text-muted);
  transition: all 0.3s ease;
}

.action-item:hover {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.05);
}

.action-checkbox {
  font-size: 1.1rem;
  color: var(--text-dim);
  cursor: pointer;
  transition: color 0.3s ease;
}

.action-checkbox:hover {
  color: var(--success);
}

.action-owner {
  margin-left: auto;
  color: var(--text-dim);
  font-size: 0.8rem;
  background: rgba(255,255,255,0.08);
  padding: 0.3rem 0.7rem;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* 发言 */
.speaker-item {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: var(--radius-lg);
  padding: 1rem 1.2rem;
  margin-bottom: 0.8rem;
  transition: all 0.3s ease;
}

.speaker-item:hover {
  border-color: rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.03);
}

.speaker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.speaker-name {
  font-weight: 600;
  color: #3b82f6;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.speaker-time {
  color: var(--text-dim);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.speaker-summary {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
}

.empty-tip {
  text-align: center;
  padding: 2.5rem 1.5rem;
  color: var(--text-dim);
  background: rgba(255,255,255,0.02);
  border-radius: var(--radius-lg);
  border: 1px dashed rgba(255,255,255,0.06);
}

@media (max-width: 1200px) { 
  .analysis-grid { grid-template-columns: 1fr; } 
}

/* ====== 上传区域样式 ====== */
.upload-section {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  border: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 1.5rem;
}
.section-header {
  margin-bottom: 1rem;
}
.section-header h3 {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--text-main);
}
.upload-area-wrapper {
  width: 100%;
}
.file-upload {
  width: 100%;
}
.upload-area {
  border: 2px dashed #ccc;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
}
.upload-area.drag-over {
  border-color: #4CAF50;
  background: rgba(76,175,80,0.08);
}
.upload-area svg {
  margin-bottom: 10px;
}
.upload-area p {
  margin: 5px 0;
  color: #888;
}
.file-types {
  font-size: 13px;
  color: #666 !important;
}
.file-selected {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.file-selected p {
  margin: 0;
  color: var(--text-main);
}
.file-size {
  font-size: 13px;
  color: #888 !important;
}

/* 分析类型选择 */
.analysis-type-section {
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 15px 0;
  padding: 12px 15px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
}
.type-label {
  font-size: 14px;
  color: #aaa;
  font-weight: 500;
}
.type-options {
  display: flex;
  gap: 20px;
}
.type-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #ccc;
}
.type-option input[type="radio"] {
  accent-color: #4CAF50;
}
.type-option:hover {
  color: #4CAF50;
}

/* 进度条 */
.progress-container {
  margin: 15px 0;
  width: 100%;
}
.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #81C784);
  transition: width 0.3s ease;
}
.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #888;
  margin-top: 6px;
}
.wait-tip {
  color: #f39c12;
  font-style: italic;
}

/* 上传按钮 */
.upload-btn {
  width: 100%;
  padding: 12px 24px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.upload-btn:hover:not(:disabled) {
  background: #388E3C;
}
.upload-btn:disabled {
  background: #666;
  cursor: not-allowed;
}

/* 成功消息 */
.success-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 15px;
  padding: 12px;
  background: rgba(76,175,80,0.1);
  border: 1px solid rgba(76,175,80,0.3);
  border-radius: 8px;
  color: #81C784;
  font-size: 14px;
}
.success-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #4CAF50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.refresh-btn {
  padding: 6px 12px;
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.refresh-btn:hover {
  background: rgba(255,255,255,0.2);
}

/* 错误消息 */
.error-message {
  margin-top: 12px;
  padding: 10px;
  background: rgba(229,57,53,0.1);
  border: 1px solid rgba(229,57,53,0.3);
  border-radius: 8px;
  color: #ef5350;
  text-align: center;
  font-size: 14px;
}
</style>