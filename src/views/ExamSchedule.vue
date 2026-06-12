<template>
  <div class="exam-schedule">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>智能排程</span>
          <div class="header-actions">
            <el-date-picker
              v-model="scheduleDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 180px"
              @change="loadSchedule"
            />
            <el-button type="primary" @click="generateSchedule" :loading="generating">
              <el-icon><MagicStick /></el-icon>智能生成排程
            </el-button>
            <el-button 
              v-if="scheduleList.length > 0" 
              type="success" 
              @click="approveSchedule"
              :disabled="approvalStatus === 'approved'"
            >
              <el-icon><Check /></el-icon>{{ approvalStatus === 'approved' ? '已审批' : '主任审批' }}
            </el-button>
          </div>
        </div>
      </template>

      <el-empty v-if="scheduleList.length === 0 && !loading" description="暂无排程数据，请点击'智能生成排程'" />
      
      <div v-else>
        <div class="schedule-summary">
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="summary-item">
                <span class="label">受检人数</span>
                <span class="value">{{ scheduleList.length }} 人</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <span class="label">检查项目总数</span>
                <span class="value">{{ totalItems }} 项</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <span class="label">审批状态</span>
                <el-tag :type="approvalStatus === 'approved' ? 'success' : 'warning'" size="small">
                  {{ approvalStatus === 'approved' ? '已审批' : '待审批' }}
                </el-tag>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="summary-item">
                <span class="label">排程日期</span>
                <span class="value">{{ scheduleDate }}</span>
              </div>
            </el-col>
          </el-row>
        </div>

        <el-table :data="scheduleList" v-loading="loading" stripe>
          <el-table-column prop="appointment_no" label="体检号" width="130" fixed="left" />
          <el-table-column prop="patient_name" label="姓名" width="80" fixed="left" />
          <el-table-column prop="gender" label="性别" width="60" fixed="left">
            <template #default="{ row }">
              {{ row.gender === 'male' ? '男' : '女' }}
            </template>
          </el-table-column>
          <el-table-column label="排程项目">
            <template #default="{ row }">
              <div class="timeline-container">
                <div 
                  v-for="(item, idx) in row.items" 
                  :key="item.id" 
                  class="timeline-item"
                  :class="{ 
                    'is-fasting': item.require_fasting,
                    'is-completed': item.status === 'completed',
                    'is-progress': item.status === 'in_progress'
                  }"
                  :title="`${item.exam_item_name} | ${item.start_time}-${item.end_time} | ${item.department}`"
                >
                  <div class="item-time">{{ item.start_time }}</div>
                  <div class="item-name">{{ item.exam_item_name }}</div>
                  <div class="item-room">{{ item.room || item.department }}</div>
                  <el-tag 
                    v-if="item.require_fasting" 
                    size="small" 
                    type="warning" 
                    class="item-tag"
                  >空腹</el-tag>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="viewDetail(row)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="排程详情" width="700px">
      <div v-if="currentSchedule" class="schedule-detail">
        <div class="patient-info">
          <el-descriptions :column="3" size="small">
            <el-descriptions-item label="体检号">{{ currentSchedule.appointment_no }}</el-descriptions-item>
            <el-descriptions-item label="姓名">{{ currentSchedule.patient_name }}</el-descriptions-item>
            <el-descriptions-item label="性别">
              {{ currentSchedule.gender === 'male' ? '男' : '女' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <el-table :data="currentSchedule.items" size="small" border>
          <el-table-column prop="sort_order" label="序号" width="60" type="index" />
          <el-table-column prop="exam_item_name" label="检查项目" width="130" />
          <el-table-column prop="department" label="科室" width="100" />
          <el-table-column prop="start_time" label="开始时间" width="100" />
          <el-table-column prop="end_time" label="结束时间" width="100" />
          <el-table-column prop="standard_duration" label="时长(分)" width="80" />
          <el-table-column prop="doctor_name" label="医生" width="100">
            <template #default="{ row }">
              {{ row.doctor_name || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="equipment_name" label="设备" width="100">
            <template #default="{ row }">
              {{ row.equipment_name || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="room" label="诊室" width="100" />
          <el-table-column label="空腹" width="70">
            <template #default="{ row }">
              <el-tag v-if="row.require_fasting" size="small" type="warning">是</el-tag>
              <span v-else style="color: #c0c4cc">-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const loading = ref(false)
const generating = ref(false)
const scheduleDate = ref(dayjs().format('YYYY-MM-DD'))
const scheduleList = ref([])
const detailVisible = ref(false)
const currentSchedule = ref(null)

const totalItems = computed(() => {
  return scheduleList.value.reduce((sum, s) => sum + s.items.length, 0)
})

const approvalStatus = computed(() => {
  if (scheduleList.value.length === 0) return 'pending'
  return scheduleList.value[0].approval_status || 'pending'
})

const loadSchedule = async () => {
  loading.value = true
  try {
    if (window.api) {
      scheduleList.value = await window.api.examSchedule.list(scheduleDate.value)
    } else {
      scheduleList.value = mockSchedules
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const generateSchedule = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要为 ${scheduleDate.value} 生成智能排程吗？\n系统将根据预约人数、医生排班和设备状态自动计算最优路径。`,
      '生成排程',
      { type: 'info' }
    )
    
    generating.value = true
    if (window.api) {
      const result = await window.api.examSchedule.generate(scheduleDate.value)
      if (result.success) {
        ElMessage.success(result.message)
        loadSchedule()
      } else {
        ElMessage.warning(result.message)
      }
    } else {
      await new Promise(r => setTimeout(r, 1500))
      scheduleList.value = mockSchedules
      ElMessage.success('排程生成成功，共 4 位受检者，56 项检查')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('排程生成失败')
      console.error(e)
    }
  } finally {
    generating.value = false
  }
}

const approveSchedule = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要审批通过此排程吗？审批通过后将推送至各科室终端。',
      '主任审批',
      { type: 'warning' }
    )
    
    if (window.api) {
      await window.api.examSchedule.approve(scheduleDate.value, 'approved')
    }
    scheduleList.value.forEach(s => s.approval_status = 'approved')
    ElMessage.success('审批通过，已推送至各科室')
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

const viewDetail = (row) => {
  currentSchedule.value = row
  detailVisible.value = true
}

const mockItems = [
  { id: 1, exam_item_name: '身高体重', department: '一般检查', start_time: '07:30', end_time: '07:35', standard_duration: 5, require_fasting: 0, doctor_name: '张医生', equipment_name: null, room: '一般检查室', sort_order: 0 },
  { id: 2, exam_item_name: '血压', department: '一般检查', start_time: '07:35', end_time: '07:40', standard_duration: 5, require_fasting: 0, doctor_name: '张医生', equipment_name: null, room: '一般检查室', sort_order: 1 },
  { id: 3, exam_item_name: '血常规', department: '检验科', start_time: '07:40', end_time: '07:50', standard_duration: 10, require_fasting: 1, doctor_name: '刘医生', equipment_name: null, room: '采血室', sort_order: 2 },
  { id: 4, exam_item_name: '肝功能', department: '检验科', start_time: '07:50', end_time: '08:05', standard_duration: 15, require_fasting: 1, doctor_name: '刘医生', equipment_name: null, room: '采血室', sort_order: 3 },
  { id: 5, exam_item_name: '空腹血糖', department: '检验科', start_time: '08:05', end_time: '08:15', standard_duration: 10, require_fasting: 1, doctor_name: '刘医生', equipment_name: null, room: '采血室', sort_order: 4 },
  { id: 6, exam_item_name: '腹部彩超', department: '超声科', start_time: '08:15', end_time: '08:35', standard_duration: 20, require_fasting: 1, doctor_name: '王医生', equipment_name: '彩超机1', room: '超声-1室', sort_order: 5 },
  { id: 7, exam_item_name: '心电图', department: '功能科', start_time: '08:35', end_time: '08:45', standard_duration: 10, require_fasting: 0, doctor_name: '陈医生', equipment_name: '心电图机1', room: '心电-1室', sort_order: 6 },
  { id: 8, exam_item_name: '胸部CT', department: '放射科', start_time: '08:45', end_time: '09:00', standard_duration: 15, require_fasting: 0, doctor_name: '赵医生', equipment_name: 'CT机', room: 'CT-1室', sort_order: 7 }
]

const mockSchedules = [
  { 
    appointment_id: 1, 
    appointment_no: 'TJ202401150001', 
    patient_name: '张三', 
    gender: 'male', 
    scheduled_date: '2024-01-15',
    approval_status: 'pending',
    items: mockItems 
  },
  { 
    appointment_id: 2, 
    appointment_no: 'TJ202401150002', 
    patient_name: '李四', 
    gender: 'female', 
    scheduled_date: '2024-01-15',
    approval_status: 'pending',
    items: mockItems.map((item, i) => ({
      ...item,
      id: item.id + 100,
      start_time: dayjs(`2024-01-15 ${item.start_time}`).add(5, 'minute').format('HH:mm'),
      end_time: dayjs(`2024-01-15 ${item.end_time}`).add(5, 'minute').format('HH:mm')
    }))
  },
  { 
    appointment_id: 3, 
    appointment_no: 'TJ202401150003', 
    patient_name: '王五', 
    gender: 'male', 
    scheduled_date: '2024-01-15',
    approval_status: 'pending',
    items: mockItems.map((item, i) => ({
      ...item,
      id: item.id + 200,
      start_time: dayjs(`2024-01-15 ${item.start_time}`).add(10, 'minute').format('HH:mm'),
      end_time: dayjs(`2024-01-15 ${item.end_time}`).add(10, 'minute').format('HH:mm')
    }))
  },
  { 
    appointment_id: 4, 
    appointment_no: 'TJ202401150004', 
    patient_name: '赵六', 
    gender: 'female', 
    scheduled_date: '2024-01-15',
    approval_status: 'pending',
    items: mockItems.map((item, i) => ({
      ...item,
      id: item.id + 300,
      start_time: dayjs(`2024-01-15 ${item.start_time}`).add(15, 'minute').format('HH:mm'),
      end_time: dayjs(`2024-01-15 ${item.end_time}`).add(15, 'minute').format('HH:mm')
    }))
  }
]

onMounted(() => {
  loadSchedule()
})
</script>

<style scoped>
.exam-schedule {
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

.schedule-summary {
  background: #f5f7fa;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-item .label {
  font-size: 13px;
  color: #909399;
}

.summary-item .value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.timeline-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}

.timeline-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  background: #ecf5ff;
  border-radius: 6px;
  min-width: 90px;
  position: relative;
  border-left: 3px solid #409eff;
}

.timeline-item.is-fasting {
  background: #fdf6ec;
  border-left-color: #e6a23c;
}

.timeline-item.is-completed {
  background: #f0f9eb;
  border-left-color: #67c23a;
}

.timeline-item.is-progress {
  background: #fef0f0;
  border-left-color: #f56c6c;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.item-time {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

.item-name {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  margin: 4px 0;
}

.item-room {
  font-size: 11px;
  color: #909399;
}

.item-tag {
  position: absolute;
  top: -6px;
  right: -6px;
}

.patient-info {
  margin-bottom: 16px;
}
</style>
