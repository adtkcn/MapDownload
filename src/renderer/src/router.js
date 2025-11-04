import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '@renderer/components/Home.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/about', name: 'About', component: () => import('@renderer/components/About.vue') } // Lazy load route component
]

export default createRouter({
  routes,
  history: createWebHashHistory()
})
