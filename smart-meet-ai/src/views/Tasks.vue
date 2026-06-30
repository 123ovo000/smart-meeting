<template>
  <div class="view-section">
    <div class="tasks-header">
      <h1 class="tasks-title">待办追踪</h1>
      <p class="tasks-subtitle">管理和跟踪会议中产生的待办事项</p>
    </div>
    
    <div class="tasks-controls">
      <div class="search-bar">
        <i class="fas fa-search"></i>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索待办事项..."
        >
      </div>
      <div class="filter-controls">
        <select v-model="filterStatus">
          <option value="all">全部</option>
          <option value="pending">未完成</option>
          <option value="completed">已完成</option>
        </select>
        <select v-model="filterAssignee" style="margin-left: 10px;">
          <option value="all">全部负责人</option>
          <option v-for="assignee in assignees" :key="assignee" :value="assignee">
            {{ assignee }}
          </option>
        </select>
      </div>
    </div>
    
    <div class="tasks-actions">
      <button class="add-task-btn" @click="openAddTaskModal">
        <i class="fas fa-plus"></i> 添加待办
      </button>
    </div>
    
    <div class="tasks-list" v-if="filteredTasks.length > 0">
      <div 
        class="task-card" 
        v-for="(task, index) in filteredTasks" 
        :key="index"
        :class="{ 'completed': task.status === 'completed' }"
      >
        <div class="task-checkbox">
          <input 
            type="checkbox" 
            :id="'task-' + index" 
            :checked="task.status === 'completed'"
            @change="toggleTaskStatus(index)"
          >
          <label :for="'task-' + index"></label>
        </div>
        <div class="task-content">
          <div class="task-header">
            <h3 class="task-title">{{ task.title }}</h3>
            <div class="task-actions">
              <button class="action-btn edit-btn" @click="editTask(task, index)">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn delete-btn" @click="deleteTask(index)">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="task-description" v-if="task.description">
            <p>{{ task.description }}</p>
          </div>
          <div class="task-meta">
            <span class="meta-item assignee">
              <i class="fas fa-user"></i> {{ task.assignee }}
            </span>
            <span class="meta-item due-date">
              <i class="fas fa-calendar"></i> {{ task.dueDate }}
            </span>
            <span class="meta-item priority" :class="task.priority">
              <i class="fas fa-flag"></i> {{ getPriorityText(task.priority) }}
            </span>
            <span class="meta-item meeting" v-if="task.meetingName">
              <i class="fas fa-video"></i> {{ task.meetingName }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="empty-state" v-else>
      <i class="fas fa-tasks"></i>
      <h3>暂无待办事项</h3>
      <p>您还没有添加任何待办事项</p>
      <button class="add-first-task-btn" @click="openAddTaskModal">
        <i class="fas fa-plus"></i> 添加第一个待办
      </button>
    </div>
    
    <!-- 添加/编辑待办事项模态框 -->
    <div class="modal-overlay" v-if="isModalOpen" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ isEditing ? '编辑待办事项' : '添加待办事项' }}</h3>
          <button class="close-btn" @click="closeModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveTask">
            <div class="form-group">
              <label for="task-title">标题</label>
              <input 
                type="text" 
                id="task-title" 
                v-model="formData.title" 
                required
                placeholder="输入待办事项标题"
              >
            </div>
            <div class="form-group">
              <label for="task-description">描述</label>
              <textarea 
                id="task-description" 
                v-model="formData.description"
                placeholder="输入待办事项描述"
                rows="3"
              ></textarea>
            </div>
            <div class="form-group">
              <label for="task-assignee">负责人</label>
              <select id="task-assignee" v-model="formData.assignee" required>
                <option value="">选择负责人</option>
                <option v-for="assignee in assignees" :key="assignee" :value="assignee">
                  {{ assignee }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="task-due-date">截止日期</label>
              <input 
                type="date" 
                id="task-due-date" 
                v-model="formData.dueDate" 
                required
              >
            </div>
            <div class="form-group">
              <label for="task-priority">优先级</label>
              <select id="task-priority" v-model="formData.priority" required>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
            <div class="form-group">
              <label for="task-meeting">关联会议</label>
              <select id="task-meeting" v-model="formData.meetingId">
                <option value="">无</option>
                <option v-for="meeting in uploadedVideos" :key="meeting.id" :value="meeting.id">
                  {{ meeting.name }}
                </option>
              </select>
            </div>
            <div class="form-actions">
              <button type="button" class="btn outline-btn" @click="closeModal">取消</button>
              <button type="submit" class="btn primary-btn">保存</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { uploadedVideos, loadVideos } from '../services/videoService'

const router = useRouter()

// 响应式数据
const searchQuery = ref('')
const filterStatus = ref('all')
const filterAssignee = ref('all')
const tasks = ref([])
const isModalOpen = ref(false)
const isEditing = ref(false)
const currentTaskIndex = ref(-1)

// 表单数据
const formData = ref({
  title: '',
  description: '',
  assignee: '',
  dueDate: '',
  priority: 'medium',
  meetingId: ''
})

// 负责人列表
const assignees = ref([
  '技术部',
  '产品部',
  '设计部',
  '市场部',
  '财务部',
  '运营部'
])

// 过滤任务
const filteredTasks = computed(() => {
  let filtered = [...tasks.value]
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(task => 
      task.title.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query))
    )
  }
  
  // 状态过滤
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter(task => task.status === filterStatus.value)
  }
  
  // 负责人过滤
  if (filterAssignee.value !== 'all') {
    filtered = filtered.filter(task => task.assignee === filterAssignee.value)
  }
  
  // 按优先级和截止日期排序
  return filtered.sort((a, b) => {
    // 先按优先级排序
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff
    
    // 再按截止日期排序
    return new Date(a.dueDate) - new Date(b.dueDate)
  })
})

// 获取优先级文本
const getPriorityText = (priority) => {
  const priorityMap = { high: '高', medium: '中', low: '低' }
  return priorityMap[priority] || priority
}

// 切换任务状态
const toggleTaskStatus = (index) => {
  const task = tasks.value[index]
  task.status = task.status === 'completed' ? 'pending' : 'completed'
  saveTasks()
}

// 打开添加任务模态框
const openAddTaskModal = () => {
  isEditing.value = false
  currentTaskIndex.value = -1
  formData.value = {
    title: '',
    description: '',
    assignee: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    meetingId: ''
  }
  isModalOpen.value = true
}

// 编辑任务
const editTask = (task, index) => {
  isEditing.value = true
  currentTaskIndex.value = index
  formData.value = {
    title: task.title,
    description: task.description || '',
    assignee: task.assignee,
    dueDate: task.dueDate,
    priority: task.priority,
    meetingId: task.meetingId || ''
  }
  isModalOpen.value = true
}

// 保存任务
const saveTask = () => {
  const taskData = {
    ...formData.value,
    status: 'pending',
    id: Date.now(),
    createdAt: new Date().toISOString(),
    meetingName: formData.value.meetingId 
      ? uploadedVideos.value.find(video => video.id == formData.value.meetingId)?.name 
      : ''
  }
  
  if (isEditing.value && currentTaskIndex.value !== -1) {
    // 更新现有任务
    tasks.value[currentTaskIndex.value] = {
      ...tasks.value[currentTaskIndex.value],
      ...taskData
    }
  } else {
    // 添加新任务
    tasks.value.push(taskData)
  }
  
  saveTasks()
  closeModal()
}

// 删除任务
const deleteTask = (index) => {
  const task = tasks.value[index]
  if (confirm(`确定要删除待办事项 "${task.title}" 吗？`)) {
    tasks.value.splice(index, 1)
    saveTasks()
  }
}

// 关闭模态框
const closeModal = () => {
  isModalOpen.value = false
}

// 保存任务到本地存储
const saveTasks = () => {
  localStorage.setItem('smartMeetTasks', JSON.stringify(tasks.value))
}

// 加载任务
const loadTasks = () => {
  const savedTasks = JSON.parse(localStorage.getItem('smartMeetTasks') || '[]')
  tasks.value = savedTasks
}

// 生成模拟数据
const generateMockData = () => {
  const mockTasks = [
    {
      id: 1,
      title: '完成大模型接口的重构与联调工作',
      description: '技术部需要在下周三前完成大模型接口的重构与联调工作',
      assignee: '技术部',
      dueDate: '2026-04-20',
      priority: 'high',
      status: 'pending',
      meetingId: 1,
      meetingName: '2023 Q4 产品路线图规划',
      createdAt: '2026-04-15T10:00:00Z'
    },
    {
      id: 2,
      title: '准备Q3预算审批材料',
      description: '财务部需要准备Q3预算审批材料，包括详细的费用明细',
      assignee: '财务部',
      dueDate: '2026-04-25',
      priority: 'medium',
      status: 'pending',
      meetingId: 2,
      meetingName: '核心架构微服务改造技术宣讲',
      createdAt: '2026-04-14T14:30:00Z'
    },
    {
      id: 3,
      title: 'UI组提前一周交付切图',
      description: 'UI组需要提前一周交付新版本的切图，确保开发进度',
      assignee: '设计部',
      dueDate: '2026-04-22',
      priority: 'medium',
      status: 'completed',
      meetingId: 3,
      meetingName: '市场部品牌重塑紧急会议',
      createdAt: '2026-04-13T09:15:00Z'
    },
    {
      id: 4,
      title: '市场推广计划执行',
      description: '市场部需要按照计划执行Q2的市场推广活动',
      assignee: '市场部',
      dueDate: '2026-04-30',
      priority: 'low',
      status: 'pending',
      meetingId: 0,
      meetingName: '',
      createdAt: '2026-04-12T16:45:00Z'
    }
  ]
  tasks.value = mockTasks
  saveTasks()
}

// 生命周期钩子
onMounted(() => {
  loadVideos()
  loadTasks()
  
  // 如果没有任务，生成模拟数据
  if (tasks.value.length === 0) {
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

.tasks-header {
  margin-bottom: 2rem;
  text-align: center;
}

.tasks-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: var(--text-main);
}

.tasks-subtitle {
  font-size: 1rem;
  color: var(--text-muted);
}

.tasks-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
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
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-controls select {
  min-width: 150px;
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

.tasks-actions {
  margin-bottom: 2rem;
}

.add-task-btn {
  background: var(--primary);
  color: white;
  padding: 0.8rem 2rem;
  border-radius: 8px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.add-task-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.3s ease;
  display: flex;
  gap: 1rem;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  border-color: rgba(99, 102, 241, 0.3);
}

.task-card.completed {
  opacity: 0.7;
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.2);
}

.task-card.completed .task-title {
  text-decoration: line-through;
  color: var(--text-muted);
}

.task-checkbox {
  position: relative;
  margin-top: 0.2rem;
}

.task-checkbox input {
  display: none;
}

.task-checkbox label {
  width: 20px;
  height: 20px;
  border: 2px solid var(--text-muted);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: block;
}

.task-checkbox input:checked + label {
  background: var(--primary);
  border-color: var(--primary);
}

.task-checkbox input:checked + label::after {
  content: '✓';
  position: absolute;
  top: -2px;
  left: 2px;
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.task-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.task-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
  flex: 1;
  margin-right: 1rem;
  line-height: 1.4;
}

.task-actions {
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

.task-description {
  font-size: 0.9rem;
  color: var(--text-main);
  line-height: 1.4;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  background: rgba(255,255,255,0.05);
}

.meta-item.assignee {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
}

.meta-item.due-date {
  background: rgba(255, 159, 64, 0.1);
  color: #f59e0b;
}

.meta-item.priority {
  font-weight: 500;
}

.meta-item.priority.high {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.meta-item.priority.medium {
  background: rgba(255, 159, 64, 0.1);
  color: #f59e0b;
}

.meta-item.priority.low {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.meta-item.meeting {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
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

.add-first-task-btn {
  background: var(--primary);
  color: white;
  padding: 0.8rem 2rem;
  border-radius: 8px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.add-first-task-btn:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(255,255,255,0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.modal-header h3 {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--text-main);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0.5rem;
  border-radius: 4px;
}

.close-btn:hover {
  background: rgba(255,255,255,0.1);
  color: var(--text-main);
}

.form-group {
  margin-bottom: 1.2rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-main);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  background: var(--bg-base);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  padding: 0.8rem;
  color: var(--text-main);
  font-size: 0.9rem;
  outline: none;
  transition: all 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.btn {
  padding: 0.8rem 1.5rem;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .view-section {
    padding: 1rem;
  }
  
  .tasks-controls {
    flex-direction: column;
  }
  
  .search-bar {
    min-width: 100%;
  }
  
  .filter-controls {
    width: 100%;
  }
  
  .filter-controls select {
    flex: 1;
    min-width: 0;
  }
  
  .task-card {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .task-checkbox {
    align-self: flex-start;
  }
  
  .modal-content {
    width: 95%;
    padding: 1.5rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>