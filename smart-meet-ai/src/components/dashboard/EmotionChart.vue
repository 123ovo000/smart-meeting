<template>
  <div class="emotion-chart-container">
    <div class="chart-header">
      <div class="chart-title">
        <i class="fas fa-chart-pie"></i>
        <span>表情可视化分析</span>
      </div>
      <div class="chart-tabs">
        <button 
          :class="['chart-tab', { active: activeChart === 'pie' }]" 
          @click="activeChart = 'pie'"
        >
          <i class="fas fa-chart-pie"></i> 分布
        </button>
        <button 
          :class="['chart-tab', { active: activeChart === 'line' }]" 
          @click="activeChart = 'line'"
        >
          <i class="fas fa-chart-line"></i> 趋势
        </button>
        <button 
          :class="['chart-tab', { active: activeChart === 'bar' }]" 
          @click="activeChart = 'bar'"
        >
          <i class="fas fa-chart-bar"></i> 对比
        </button>
      </div>
    </div>

    <div class="chart-body">
      <div v-if="hasData" class="chart-wrapper">
        <div ref="chartRef" class="chart-canvas"></div>
      </div>
      <div v-else class="chart-empty">
        <i class="fas fa-chart-simple"></i>
        <p>暂无表情数据，请先进行表情识别检测</p>
      </div>
    </div>

    <div v-if="hasData" class="chart-footer">
      <div class="footer-stat">
        <span class="fs-label">检测总次数</span>
        <span class="fs-value">{{ emotionStats.totalDetections }}</span>
      </div>
      <div class="footer-stat">
        <span class="fs-label">检测时长</span>
        <span class="fs-value">{{ emotionStats.duration.toFixed(1) }}s</span>
      </div>
      <div class="footer-stat">
        <span class="fs-label">主要表情</span>
        <span class="fs-value">{{ dominantLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  EMOTIONS, EMOJI_MAP, EMOTION_LABELS, EMOTION_COLORS,
  emotionStats
} from '../../services/emotionService'

const chartRef = ref(null)
const activeChart = ref('pie')
let chartInstance = null

const hasData = computed(() => emotionStats.totalDetections > 0)

const dominantLabel = computed(() => {
  let maxCount = 0
  let dominant = 'neutral'
  for (const [emotion, count] of Object.entries(emotionStats.distribution)) {
    if (count > maxCount) {
      maxCount = count
      dominant = emotion
    }
  }
  return EMOTION_LABELS[dominant] || dominant
})

// 获取表情分布数据（用于饼图/柱状图）
function getDistributionData() {
  const total = emotionStats.totalDetections || 1
  return EMOTIONS.map(emo => {
    const count = emotionStats.distribution[emo.label] || 0
    return {
      name: EMOTION_LABELS[emo.label],
      value: count,
      percent: ((count / total) * 100).toFixed(1),
      itemStyle: { color: emo.color }
    }
  }).filter(item => item.value > 0)
}

// 获取时间线数据（用于折线图）
function getTimelineData() {
  const timeline = emotionStats.timeline
  if (timeline.length === 0) return { times: [], data: [] }
  
  // 按时间排序
  const sorted = [...timeline].sort((a, b) => parseFloat(a.time) - parseFloat(b.time))
  
  return {
    times: sorted.map(t => t.time + 's'),
    data: sorted.map(t => ({
      value: parseFloat(t.probability),
      emotion: t.emotion,
      label: EMOTION_LABELS[t.emotion] || t.emotion,
      emoji: EMOJI_MAP[t.emotion] || ''
    }))
  }
}

function renderChart() {
  if (!chartRef.value) return
  
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  
  const isDark = true
  const textColor = '#9ca3af'
  const axisColor = 'rgba(255,255,255,0.05)'
  
  let option = {}
  
  if (activeChart.value === 'pie') {
    const data = getDistributionData()
    option = {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          return `${params.name}<br/>次数: ${params.value} (${params.data.percent}%)`
        }
      },
      series: [{
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#1e1e24',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: (params) => {
            return `${params.name}\n${params.data.percent}%`
          },
          color: textColor,
          fontSize: 11
        },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' }
        },
        data
      }]
    }
  } else if (activeChart.value === 'line') {
    const { times, data } = getTimelineData()
    option = {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const p = params[0]
          return `${p.axisValue}<br/>${p.data.emoji} ${p.data.label}: ${p.data.value}%`
        }
      },
      grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: { color: textColor, fontSize: 10 },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { color: textColor, formatter: '{value}%' },
        splitLine: { lineStyle: { color: axisColor } }
      },
      series: [{
        type: 'line',
        data: data.map(d => ({
          value: d.value,
          emoji: d.emoji,
          label: d.label
        })),
        smooth: true,
        lineStyle: { width: 2, color: '#6366f1' },
        itemStyle: { color: '#6366f1' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(99, 102, 241, 0.3)' },
            { offset: 1, color: 'rgba(99, 102, 241, 0.02)' }
          ])
        },
        markPoint: {
          data: [
            { type: 'max', name: '最大值' },
            { type: 'min', name: '最小值' }
          ],
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: { color: '#fbbf24' }
        }
      }]
    }
  } else if (activeChart.value === 'bar') {
    const data = getDistributionData()
    option = {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const p = params[0]
          return `${p.name}<br/>次数: ${p.value} (${p.data.percent}%)`
        }
      },
      grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLabel: { color: textColor, fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: axisColor } }
      },
      series: [{
        type: 'bar',
        barWidth: '50%',
        data: data.map(d => ({
          value: d.value,
          percent: d.percent,
          itemStyle: {
            color: d.itemStyle.color,
            borderRadius: [4, 4, 0, 0]
          }
        })),
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' }
        }
      }]
    }
  }
  
  chartInstance.setOption(option, true)
  chartInstance.resize()
}

// 监听数据变化
watch([() => emotionStats.totalDetections, activeChart], () => {
  nextTick(renderChart)
})

// 监听窗口大小变化
function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  nextTick(renderChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<style scoped>
.emotion-chart-container {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255,255,255,0.05);
  overflow: hidden;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.2);
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--text-main);
}

.chart-title i {
  color: var(--primary);
}

.chart-tabs {
  display: flex;
  gap: 0.3rem;
}

.chart-tab {
  padding: 0.35rem 0.7rem;
  background: var(--bg-hover);
  color: var(--text-muted);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.3s ease;
}

.chart-tab:hover {
  background: rgba(99, 102, 241, 0.1);
  color: var(--text-main);
}

.chart-tab.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.chart-body {
  padding: 1rem;
}

.chart-wrapper {
  width: 100%;
}

.chart-canvas {
  width: 100%;
  height: 280px;
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-muted);
  gap: 0.8rem;
}

.chart-empty i {
  font-size: 3rem;
  opacity: 0.3;
}

.chart-empty p {
  font-size: 0.9rem;
}

.chart-footer {
  display: flex;
  gap: 1rem;
  padding: 0.8rem 1.5rem;
  border-top: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.1);
}

.footer-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.fs-label {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.fs-value {
  font-size: 1rem;
  font-weight: bold;
  color: var(--accent);
}
</style>
