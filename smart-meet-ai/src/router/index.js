import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Meetings from '../views/Meetings.vue'
import Analysis from '../views/Analysis.vue'
import Tasks from '../views/Tasks.vue'
import Upload from '../views/Upload.vue'
import Starred from '../views/Starred.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard },
  { path: '/meetings', name: 'Meetings', component: Meetings },
  { path: '/analysis/:jobId?', name: 'Analysis', component: Analysis },
  { path: '/tasks', name: 'Tasks', component: Tasks },
  { path: '/upload', name: 'Upload', component: Upload },
  { path: '/starred', name: 'Starred', component: Starred }
]


const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router