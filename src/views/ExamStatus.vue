<template>
  <div class="exam-status">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>体检状态实时监控</span>
          <div class="header-actions">
            <el-button @click="refreshData" :loading="loading">
              <el-icon><Refresh /></el-icon>刷新
            </el-button>
          </div>
        </div>
      </template>

      <div class="status-overview">
        <el-row :gutter="16">
          <el-col :span="4">
            <div class="status-card total">
              <div class="num">{{ overview.total }}</div>
              <div class="label">今日总人数</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="status-card waiting">
              <div class="num">{{ overview.waiting }}</div>
              <div class="label">候检中</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="status-card in-progress">
              <div class="num">{{ overview.inProgress }}</div>
              <div class="label">检查中</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="status-card completed">
              <div class="num">{{ overview.completed }}</div>
              <div class="label">已完成</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="status-card abnormal">
              <div class="num">{{ overview.abnormal }}</div>
              <div class="label">异常项</div>
            </div>
          </el-col>
          <el-col :span="4">
            <div class="status-card alert">
              <div class="num">{{ overview.alerts }}</div>
              <div class="label">超时预警</div>
            </div>
          </el-col>
        </el-row>
      </div>

      <el-tabs v-model="activeTab" class="status-tabs">
        <el-tab-pane label="按受检者" name="patient">
          <el-table :data="patientList" v-loading="loading" stripe>
            <el-table-column prop="appointment_no" label="体检号" width="130" fixed="left" />
            <el-table-column prop="name" label="姓名" width="80" fixed="left" />
            <el-table-column prop="gender" label="性别" width="60" fixed="left">
              <template #default="{ row }">
                {{ row.gender === 'male' ? '男' : '女' }}
              </template>
            </el-table-column>
            <el-table-column prop="package_name" label="套餐" width="140" />
            <el-table-column label="进度" width="180">
              <template #default="{ row }">
                <el-progress 
                  :percentage="Math.round(row.completed_items / row.total_items * 100)" 
                  :stroke-width="10"
                  :status="row.completed_items === row.total_items ? 'success' : ''"
                />
              </template>
            </el-table-column>
            <el-table-column label="当前科室" width="120">
              <template #default="{ row }">
                {{ row.current_dept || '候检' }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.status === 'scheduled'" size="small" type="info">待体检</el-tag>
                <el-tag v-else-if="row.status === 'in_progress'" size="small" type="warning">检查中</el-tag>
                <el-tag v-else-if="row.status === 'all_completed'" size="small" type="success">已完成</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="viewStatus(row)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="按科室" name="department">
          <el-row :gutter="16">
            <el-col :span="8" v-for="dept in deptList" :key="dept.name">
              <el-card class="dept-card" :class="getDeptStatusClass(dept)">
                <div class="dept-header">
                  <span class="dept-name">{{ dept.name }}</span>
                  <el-badge :value="dept.queue" :max="10" class="queue-badge">
                    <el-icon :size="20"><UserFilled /></el-icon>
                  </el-badge>
                </div>
                <div class="dept-stats">
                  <div class="stat">
                    <span class="stat-num">{{ dept.checking }}</span>
                    <span class="stat-label">检查中</span>
                  </div>
                  <div class="stat">
                    <span class="stat-num">{{ dept.completed }}</span>
                    <span class="stat-label">已完成</span>
                  </div>
                  <div class="stat">
                    <span class="stat-num">{{ dept.avgWait }}</span>
                    <span class="stat-label">平均等待(分)</span>
                  </div>
                </div>
                <div class="dept-heat" :style="{ width: dept.heat + '%' }"></div>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="detailVisible" title="体检流程详情" width="700px">
      <div v-if="currentPatient" class="status-detail">
        <div class="patient-header">
          <div>
            <h3>{{ currentPatient.name }}</h3>
            <p>{{ currentPatient.appointment_no }} | {{ currentPatient.gender === 'male' ? '男' : '女' }} | {{ currentPatient.package_name }}</p>
          </div>
          <el-tag :type="currentPatient.status === 'all_completed' ? 'success' : 'warning'" size="large">
            {{ currentPatient.status === 'all_completed' ? '全部完成' : '检查中' }}
          </el-tag>
        </div>

        <el-steps :active="currentStep" direction="vertical" finish-status="success">
          <el-step title="登记" icon="EditPen">
            <template #title>
              <span>登记签到</span>
            </template>
            <template #description>
              <span style="color: #67c23a">已完成</span>
            </template>
          </el-step>
          <el-step title="检查中" icon="Connection">
            <template #title>
              <span>项目检查</span>
            </template>
            <template #description>
              <span>{{ currentPatient.completed_items }} / {{ currentPatient.total_items }} 项已完成</span>
            </template>
          </el-step>
          <el-step title="报告生成" icon="Document">
            <template #title>
              <span>报告生成</span>
            </template>
          </el-step>
          <el-step title="总检完成" icon="CircleCheck">
            <template #title>
              <span>总检完成</span>
            </template>
          </el-step>
        </el-steps>

        <div class="exam-items-list">
          <h4>项目检查情况</h4>
          <div 
            v-for="item in examItems" 
            :key="item.id" 
            class="exam-item-row"
            :class="item.status"
          >
            <div class="item-left">
              <el-icon v-if="item.status === 'completed'" color="#67c23a"><CircleCheckFilled /></el-icon>
              <el-icon v-else-if="item.status === 'in_progress'" color="#e6a23c" class="rotating"><Loading /></el-icon>
              <el-icon v-else color="#c0c4cc"><Clock /></el-icon>
              <span class="item-name">{{ item.exam_item_name }}</span>
              <el-tag v-if="item.is_abnormal" size="small" type="danger">异常</el-tag>
            </div>
            <div class="item-right">
              <span class="item-dept">{{ item.department }}</span>
              <span class="item-time">{{ item.start_time || '--:--' }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

const loading = ref(false)
const activeTab = ref('patient')
const detailVisible = ref(false)
const currentPatient = ref(null)
const examItems = ref([])
let refreshTimer = null

const patientList = ref([])

const overview = reactive({
  total: 0,
  waiting: 0,
  inProgress: 0,
  completed: 0,
  abnormal: 0,
  alerts: 0
})

const deptList = ref([
  { name: '一般检查', checking: 2, completed: 15, queue: 1, avgWait: 3, heat: 30 },
  { name: '检验科', checking: 3, completed: 20, queue: 5, avgWait: 8, heat: 70 },
  { name: '超声科', checking: 2, completed: 8, queue: 6, avgWait: 15, heat: 85 },
  { name: '放射科', checking: 1, completed: 6, queue: 3, avgWait: 12, heat: 50 },
  { name: '功能科', checking: 2, completed: 12, queue: 2, avgWait: 6, heat: 40 },
  { name: '内科', checking: 1, completed: 10, queue: 0, avgWait: 2, heat: 25 }
])

const currentStep = computed(() => {
  if (!currentPatient.value) return 0
  if (currentPatient.value.status === 'all_completed') return 3
  if (currentPatient.value.completed_items > 0) return 1
  return 0
})

const loadData = async () => {
  loading.value = true
  try {
    if (window.api) {
      const data = await window.api.examStatus.listToday()
      patientList.value = data
      overview.total = data.length
      overview.completed = data.filter(d => d.completed_items === d.total_items).length
      overview.inProgress = data.filter(d => d.status === 'in_progress').length
      overview.waiting = data.filter(d => d.status === 'scheduled').length
    } else {
      patientList.value = mockPatients
      overview.total = mockPatients.length
      overview.completed = mockPatients.filter(d => d.completed_items === d.total_items).length
      overview.inProgress = mockPatients.filter(d => d.status === 'in_progress').length
      overview.waiting = mockPatients.filter(d => d.status === 'scheduled').length
      overview.abnormal = 3
      overview.alerts = 2
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadData()
}

const viewStatus = async (row) => {
  currentPatient.value = row
  if (window.api) {
    examItems.value = await window.api.examStatus.getByAppointment(row.id)
  } else {
    examItems.value = mockExamItems
  }
  detailVisible.value = true
}

const getDeptStatusClass = (dept) => {
  if (dept.heat >= 80) return 'busy'
  if (dept.heat >= 50) return 'normal'
  return 'idle'
}

const mockPatients = [
  { id: 1, appointment_no: 'TJ202401150001', name: '张三', gender: 'male', package_name: '标准体检套餐B', total_items: 15, completed_items: 15, status: 'all_completed', current_dept: '已完成', first_time: '07:30' },
  { id: 2, appointment_no: 'TJ202401150002', name: '李四', gender: 'female', package_name: '基础体检套餐A', total_items: 12, completed_items: 8, status: 'in_progress', current_dept: '超声科', first_time: '07:35' },
  { id: 3, appointment_no: 'TJ202401150003', name: '王五', gender: 'male', package_name: '精英体检套餐C', total_items: 18, completed_items: 5, status: 'in_progress', current_dept: '检验科', first_time: '07:40' },
  { id: 4, appointment_no: 'TJ202401150004', name: '赵六', gender: 'female', package_name: '标准体检套餐B', total_items: 15, completed_items: 0, status: 'scheduled', current_dept: '', first_time: '07:45' },
  { id: 5, appointment_no: 'TJ202401150005', name: '钱七', gender: 'male', package_name: '基础体检套餐A', total_items: 12, completed_items: 10, status: 'in_progress', current_dept: '放射科', first_time: '07:50' }
]

const mockExamItems = [
  { id: 1, exam_item_name: '身高体重', department: '一般检查', status: 'completed', start_time: '07:30', is_abnormal: 0 },
  { id: 2, exam_item_name: '血压', department: '一般检查', status: 'completed', start_time: '07:35', is_abnormal: 0 },
  { id: 3, exam_item_name: '血常规', department: '检验科', status: 'completed', start_time: '07:40', is_abnormal: 0 },
  { id: 4, exam_item_name: '肝功能', department: '检验科', status: 'completed', start_time: '07:50', is_abnormal: 1 },
  { id: 5, exam_item_name: '空腹血糖', department: '检验科', status: 'completed', start_time: '08:00', is_abnormal: 0 },
  { id: 6, exam_item_name: '腹部彩超', department: '超声科', status: 'in_progress', start_time: '08:10', is_abnormal: 0 },
  { id: 7, exam_item_name: '心电图', department: '功能科', status: 'pending', start_time: null, is_abnormal: 0 },
  { id: 8, exam_item_name: '胸部CT', department: '放射科', status: 'pending', start_time: null, is_abnormal: 0 }
]

onMounted(() => {
  loadData()
  refreshTimer = setInterval(() => {
    loadData()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.exam-status {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.status-overview {
  margin-bottom: 20px;
}

.status-card {
  text-align: center;
  padding: 20px;
  border-radius: 8px;
  color: white;
}

.status-card.total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.status-card.waiting { background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); }
.status-card.in-progress { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.status-card.completed { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.status-card.abnormal { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); }
.status-card.alert { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }

.status-card .num {
  font-size: 32px;
  font-weight: bold;
  line-height: 1.2;
}

.status-card .label {
  font-size: 14px;
  margin-top: 6px;
  opacity: 0.9;
}

.status-tabs {
  margin-top: 10px;
}

.dept-card {
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}

.dept-card.busy :deep(.el-card__body) {
  border-top: 3px solid #f56c6c;
}

.dept-card.normal :deep(.el-card__body) {
  border-top: 3px solid #e6a23c;
}

.dept-card.idle :deep(.el-card__body) {
  border-top: 3px solid #67c23a;
}

.dept-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.dept-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.queue-badge {
  color: #909399;
}

.dept-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
}

.dept-stats .stat {
  text-align: center;
}

.dept-stats .stat-num {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.dept-stats .stat-label {
  font-size: 12px;
  color: #909399;
}

.dept-heat {
  height: 4px;
  background: linear-gradient(90deg, #67c23a, #e6a23c, #f56c6c);
  border-radius: 2px;
  position: absolute;
  bottom: 0;
  left: 0;
}

.patient-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 20px;
}

.patient-header h3 {
  font-size: 20px;
  color: #303133;
  margin-bottom: 4px;
}

.patient-header p {
  color: #909399;
  font-size: 14px;
}

.exam-items-list {
  margin-top: 20px;
}

.exam-items-list h4 {
  margin-bottom: 12px;
  color: #303133;
}

.exam-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
}

.exam-item-row.completed {
  background: #f0f9eb;
}

.exam-item-row.in_progress {
  background: #fdf6ec;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-name {
  font-weight: 500;
  color: #303133;
}

.item-right {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #909399;
}

.rotating {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
