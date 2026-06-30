// src/services/videoService.js
import { ref } from 'vue'
import axios from 'axios'

// ====== 阿里云通义听悟配置 ======
const ACCESS_KEY_ID = import.meta.env.VITE_ALIBABA_CLOUD_ACCESS_KEY_ID || 'LTAI5t7rm2fEJ7uJivhFXB5V'
const ACCESS_KEY_SECRET = import.meta.env.VITE_ALIBABA_CLOUD_ACCESS_KEY_SECRET || '86RqolZSgUnt2CBssde6igTP2wlG7R'
const APP_KEY = import.meta.env.VITE_ALIBABA_CLOUD_APP_KEY || 'zKslqHQDn2n0ktLz'
const TINGWU_API_URL = 'https://tingwu.aliyuncs.com/api/v1/tingwu/task/create_video_task'

// 视频数据共享状态
export const uploadedVideos = ref([])
export const currentVideo = ref(null)

// 加载视频数据
export const loadVideos = async () => {
    try {
        const db = await initIndexedDB()
        const transaction = db.transaction('videos', 'readonly')
        const store = transaction.objectStore('videos')
        const request = store.getAll()

        return new Promise((resolve) => {
            request.onsuccess = () => {
                uploadedVideos.value = request.result
                resolve()
            }
            request.onerror = () => {
                loadVideosFromLocalStorage()
                resolve()
            }
        })
    } catch (error) {
        console.error('加载视频失败:', error)
        loadVideosFromLocalStorage()
    }
}

// 从localStorage加载视频
export const loadVideosFromLocalStorage = () => {
    const videos = JSON.parse(localStorage.getItem('smartMeetVideos') || '[]')
    uploadedVideos.value = videos
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

// 保存视频到IndexedDB
export const saveVideoToIndexedDB = (video) => {
    return new Promise((resolve, reject) => {
        initIndexedDB().then(db => {
            const transaction = db.transaction('videos', 'readwrite')
            const store = transaction.objectStore('videos')
            const request = store.add(video)
            request.onsuccess = () => resolve()
            request.onerror = () => reject()
        }).catch(reject)
    })
}

// 保存视频到localStorage（备用）
const saveVideoToLocalStorage = (video) => {
    const videos = JSON.parse(localStorage.getItem('smartMeetVideos') || '[]')
    videos.push(video)
    localStorage.setItem('smartMeetVideos', JSON.stringify(videos))
}

// 生成视频缩略图
const generateVideoThumbnail = (file) => {
    return new Promise((resolve) => {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.playsInline = true
        video.muted = true
        video.src = URL.createObjectURL(file)
        
        video.onloadeddata = () => {
            video.currentTime = 1
        }
        
        video.onseeked = () => {
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const thumbnail = canvas.toDataURL('image/jpeg', 0.3)
            URL.revokeObjectURL(video.src)
            resolve(thumbnail)
        }
        
        video.onerror = () => {
            resolve('')
        }
    })
}

// ====== 上传视频并处理 ======
export const uploadAndProcessVideo = async (file) => {
    // 1. 生成本地预览URL和缩略图
    const localUrl = URL.createObjectURL(file)
    const thumbnail = await generateVideoThumbnail(file)

    // 2. 创建视频对象
    const newVideo = {
        id: Date.now(),
        name: file.name,
        url: localUrl,
        type: file.type || 'video/mp4',
        thumbnail: thumbnail,
        uploadDate: new Date().toLocaleDateString('zh-CN'),
        duration: 0,
        size: file.size,
        highlights: [],
        transcript: ''
    }

    // 3. 尝试获取视频时长
    try {
        const tempVideo = document.createElement('video')
        tempVideo.preload = 'metadata'
        tempVideo.src = localUrl
        await new Promise((resolve) => {
            tempVideo.onloadedmetadata = () => {
                newVideo.duration = Math.round(tempVideo.duration)
                resolve()
            }
            tempVideo.onerror = () => resolve()
            setTimeout(resolve, 3000)
        })
        tempVideo.remove()
    } catch (e) {
        console.warn('获取视频时长失败:', e)
    }

    // 4. 尝试调用通义听悟API（如果失败也不影响本地预览）
    try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('app_key', APP_KEY)

        const response = await axios.post(TINGWU_API_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 10000
        })

        if (response.data && response.data.task_id) {
            const taskId = response.data.task_id
            console.log('通义听悟任务已创建，ID:', taskId)
            newVideo.taskId = taskId
        }
    } catch (apiError) {
        console.warn('通义听悟API调用失败（不影响本地预览）:', apiError.message)
        // API失败不影响本地功能
    }

    // 5. 保存到本地存储
    try {
        await saveVideoToIndexedDB(newVideo)
    } catch (e) {
        saveVideoToLocalStorage(newVideo)
    }

    // 6. 添加到列表
    uploadedVideos.value.push(newVideo)
    currentVideo.value = newVideo

    return newVideo
}