<template>
  <div class="dashboard">
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: #409eff">
                <el-icon :size="32"><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.todayAppointments }}</div>
                <div class="stat-label">今日预约</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: #67c23a">
                <el-icon :size="32"><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.completed }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: #e6a23c">
                <el-icon :size="32"><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.inProgress }}</div>
                <div class="stat-label">检查中</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: #f56c6c">
                <el-icon :size="32"><Bell /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.alerts }}</div>
                <div class="stat-label">预警数</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="20" class="content-row">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>今日体检进度</span>
            </div>
          </template>
          <el-table :data="todayList" v-loading="loading" stripe>
            <el-table-column prop="appointment_no" label="体检号" width="120" />
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="gender" label="性别" width="60">
              <template #default="{ row }">
                {{ row.gender === 'male' ? '男' : '女' }}
              </template>
            </el-table-column>
            <el-table-column prop="package_name" label="套餐" />
            <el-table-column label="进度" width="180">
              <template #default="{ row }">
                <el-progress 
                  :percentage="Math.round(row.completed_items / row.total_items * 100)" 
                  :stroke-width="10"
                  :status="row.completed_items === row.total_items ? 'success' : ''"
                />
              </template>
            </el-table-column>
            <el-table-column prop="first_time" label="开始时间" width="100" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="quick-actions">
          <template #header>
            <span>快捷操作</span>
          </template>
          <div class="action-grid">
            <div class="action-item" @click="$router.push('/appointment')">
              <el-icon :size="28" color="#409eff"><CalendarPlus /></el-icon>
              <span>新增预约</span>
            </div>
            <div class="action-item" @click="$router.push('/schedule')">
              <el-icon :size="28" color="#67c23a"><SetUp /></el-icon>
              <span>生成排程</span>
            </div>
            <div class="action-item" @click="$router.push('/package')">
              <el-icon :size="28" color="#e6a23c"><Goods /></el-icon>
              <span>套餐管理</span>
            </div>
            <div class="action-item" @click="$router.push('/exam-status')">
              <el-icon :size="28" color="#909399"><Connection /></el-icon>
              <span>状态监控</span>
            </div>
          </div>
        </el-card>

        <el-card class="recent-alerts" style="margin-top: 20px">
          <template #header>
            <span>最近预警</span>
          </template>
          <el-empty v-if="alerts.length === 0" description="暂无预警" :image-size="80" />
          <div v-else class="alert-list">
            <div v-for="alert in alerts" :key="alert.id" class="alert-item">
              <el-icon :size="18" :color="alert.level === 'warning' ? '#e6a23c' : '#f56c6c'">
                <Warning />
              </el-icon>
              <span>{{ alert.content }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const loading = ref(false)
const todayList = ref([])
const alerts = ref([])

const stats = reactive({
  todayAppointments: 0,
  completed: 0,
  inProgress: 0,
  alerts: 0
})

const loadData = async () => {
  loading.value = true
  try {
    if (window.api) {
      const data = await window.api.examStatus.listToday()
      todayList.value = data
      stats.todayAppointments = data.length
      stats.completed = data.filter(d => d.completed_items === d.total_items).length
      stats.inProgress = data.filter(d => d.status === 'in_progress').length
      
      const alertData = await window.api.examStatus.getAlerts()
      alerts.value = alertData
      stats.alerts = alertData.length
    } else {
      todayList.value = mockData
      stats.todayAppointments = mockData.length
      stats.completed = 8
      stats.inProgress = 5
      stats.alerts = 2
      alerts.value = [
        { id: 1, level: 'warning', content: '1003号受检者超时未完成' },
        { id: 2, level: 'danger', content: '超声科排队人数超过8人' }
      ]
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const mockData = [
  { appointment_no: 'TJ202401150001', name: '张三', gender: 'male', package_name: '标准体检套餐B', total_items: 15, completed_items: 15, first_time: '07:30', status: 'all_completed' },
  { appointment_no: 'TJ202401150002', name: '李四', gender: 'female', package_name: '基础体检套餐A', total_items: 12, completed_items: 8, first_time: '07:35', status: 'in_progress' },
  { appointment_no: 'TJ202401150003', name: '王五', gender: 'male', package_name: '精英体检套餐C', total_items: 18, completed_items: 3, first_time: '07:40', status: 'in_progress' }
]

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stat-card {
  border-radius: 8px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.content-row {
  flex: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-actions .action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-item:hover {
  background: #ecf5ff;
  transform: translateY(-2px);
}

.action-item span {
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fdf6ec;
  border-radius: 6px;
  font-size: 13px;
  color: #e6a23c;
}
</style>
