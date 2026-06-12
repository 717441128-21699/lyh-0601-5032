<template>
  <el-container class="main-container">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon :size="28" color="#409eff"><MedicalLocation /></el-icon>
        <span class="logo-text">体检中心调度系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        background-color="#001529"
        text-color="#b3c0d1"
        active-text-color="#ffffff"
        router
      >
        <el-menu-item
          v-for="item in menuItems"
          :key="item.path"
          :index="item.path"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-badge :value="alertCount" :hidden="alertCount === 0" class="alert-badge">
            <el-button type="primary" text @click="showAlerts">
              <el-icon :size="18"><Bell /></el-icon>
            </el-button>
          </el-badge>
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="32" icon="UserFilled" />
              <span class="username">管理员</span>
              <el-icon><CaretBottom /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人中心</el-dropdown-item>
                <el-dropdown-item divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElNotification } from 'element-plus'

const route = useRoute()

const menuItems = [
  { path: '/dashboard', title: '首页概览', icon: 'Odometer' },
  { path: '/appointment', title: '预约登记', icon: 'Calendar' },
  { path: '/schedule', title: '智能排程', icon: 'SetUp' },
  { path: '/exam-status', title: '体检状态', icon: 'Connection' },
  { path: '/package', title: '套餐管理', icon: 'Goods' },
  { path: '/exam-item', title: '检查项目', icon: 'List' },
  { path: '/doctor', title: '医生排班', icon: 'User' },
  { path: '/equipment', title: '设备管理', icon: 'Monitor' },
  { path: '/statistics', title: '统计报表', icon: 'DataAnalysis' }
]

const alertCount = ref(0)

const activeMenu = computed(() => route.path)

const currentPageTitle = computed(() => {
  const item = menuItems.find(m => m.path === route.path)
  return item ? item.title : ''
})

const showAlerts = () => {
  ElNotification.info({
    title: '系统通知',
    message: `当前有 ${alertCount.value} 条未读预警`,
    duration: 3000
  })
}

onMounted(async () => {
  try {
    if (window.api) {
      const alerts = await window.api.examStatus.getAlerts()
      alertCount.value = alerts.length
    }
  } catch (e) {
    console.log('Browser mode, no electron API')
  }
})
</script>

<style scoped>
.main-container {
  height: 100vh;
}

.sidebar {
  background-color: #001529;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-bottom: 1px solid #1f3a57;
}

.logo-text {
  color: #ffffff;
  font-size: 16px;
  font-weight: bold;
}

.sidebar-menu {
  border-right: none;
  flex: 1;
}

.sidebar-menu :deep(.el-menu-item) {
  height: 48px;
  line-height: 48px;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background-color: #1f3a57 !important;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background-color: #409eff !important;
}

.header {
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.alert-badge {
  margin-right: 10px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.username {
  color: #303133;
  font-size: 14px;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
