import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/',
    component: () => import('@/layout/MainLayout.vue'),
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页概览', icon: 'Odometer' }
      },
      {
        path: 'appointment',
        name: 'Appointment',
        component: () => import('@/views/Appointment.vue'),
        meta: { title: '预约登记', icon: 'Calendar' }
      },
      {
        path: 'schedule',
        name: 'Schedule',
        component: () => import('@/views/ExamSchedule.vue'),
        meta: { title: '智能排程', icon: 'SetUp' }
      },
      {
        path: 'exam-status',
        name: 'ExamStatus',
        component: () => import('@/views/ExamStatus.vue'),
        meta: { title: '体检状态', icon: 'Connection' }
      },
      {
        path: 'package',
        name: 'Package',
        component: () => import('@/views/PackageManage.vue'),
        meta: { title: '套餐管理', icon: 'Goods' }
      },
      {
        path: 'exam-item',
        name: 'ExamItem',
        component: () => import('@/views/ExamItemManage.vue'),
        meta: { title: '检查项目', icon: 'List' }
      },
      {
        path: 'doctor',
        name: 'Doctor',
        component: () => import('@/views/DoctorManage.vue'),
        meta: { title: '医生排班', icon: 'User' }
      },
      {
        path: 'equipment',
        name: 'Equipment',
        component: () => import('@/views/EquipmentManage.vue'),
        meta: { title: '设备管理', icon: 'Monitor' }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/Statistics.vue'),
        meta: { title: '统计报表', icon: 'DataAnalysis' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
