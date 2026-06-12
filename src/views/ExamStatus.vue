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
            <el-table-column label="进度" width="200">
              <template #default="{ row }">
                <el-progress 
                  :percentage="row.total_items ? Math.round(row.completed_items / row.total_items * 100) : 0" 
                  :stroke-width="10"
                  :status="row.completed_items === row.total_items ? 'success' : ''"
                />
                <span style="margin-left: 8px; font-size: 12px; color: #909399">
                  {{ row.completed_items }}/{{ row.total_items }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="当前科室" width="120">
              <template #default="{ row }">
                {{ row.current_dept || '候检' }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="预约状态" width="120">
              <template #default="{ row }">
                <el-tag v-if="row.status === 'scheduled'" size="small" type="info">待体检</el-tag>
                <el-tag v-else-if="row.status === 'in_progress'" size="small" type="warning">检查中</el-tag>
                <el-tag v-else-if="row.status === 'all_completed'" size="small" type="success">全部完成</el-tag>
                <el-tag v-else-if="row.status === 'all_reported'" size="small" type="primary">报告生成</el-tag>
                <el-tag v-else-if="row.status === 'chief_reviewed'" size="small" type="success">总检完成</el-tag>
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

    <el-dialog v-model="detailVisible" title="体检流程详情" width="900px" @close="onDetailClose">
      <div v-if="currentPatient" class="status-detail">
        <div class="patient-header">
          <div>
            <h3>{{ currentPatient.name }}</h3>
            <p>
              {{ currentPatient.appointment_no }} | 
              {{ currentPatient.gender === 'male' ? '男' : '女' }} | 
              {{ currentPatient.age }}岁 | 
              {{ currentPatient.package_name }}
            </p>
          </div>
          <div>
            <el-tag :type="getStatusTagType(currentPatient.status)" size="large">
              {{ getStatusText(currentPatient.status) }}
            </el-tag>
          </div>
        </div>

        <div class="progress-bar-row">
          <div class="progress-label">
            整体进度：{{ currentPatient.completed_items }} / {{ currentPatient.total_items }} 项
          </div>
          <el-progress 
            :percentage="currentPatient.total_items ? Math.round(currentPatient.completed_items / currentPatient.total_items * 100) : 0"
            :stroke-width="12"
          />
        </div>

        <el-tabs v-model="detailTab" class="detail-tabs">
          <el-tab-pane label="项目检查" name="items">
            <div class="exam-items-list">
              <div 
                v-for="item in examItems" 
                :key="item.id" 
                class="exam-item-row"
                :class="item.status"
              >
                <div class="item-left">
                  <el-icon v-if="item.status === 'completed'" color="#67c23a" :size="18"><CircleCheckFilled /></el-icon>
                  <el-icon v-else-if="item.status === 'in_progress'" color="#e6a23c" :size="18" class="rotating"><Loading /></el-icon>
                  <el-icon v-else-if="item.status === 'report_generated'" color="#409eff" :size="18"><Document /></el-icon>
                  <el-icon v-else color="#c0c4cc" :size="18"><Clock /></el-icon>
                  <span class="item-name">{{ item.exam_item_name }}</span>
                  <el-tag v-if="item.is_abnormal && item.status === 'completed'" size="small" type="danger" effect="dark">
                    异常
                  </el-tag>
                  <el-tag v-if="item.status === 'report_generated'" size="small" type="primary" effect="plain">
                    报告已出
                  </el-tag>
                </div>
                <div class="item-center">
                  <span class="item-dept">{{ item.department }}</span>
                  <span class="item-time">{{ item.start_time || '--:--' }} - {{ item.end_time || '--:--' }}</span>
                </div>
                <div class="item-actions">
                  <el-button 
                    v-if="item.status === 'pending' || item.status === 'waiting'" 
                    size="small" 
                    type="primary" 
                    @click="startExam(item)"
                  >
                    开始检查
                  </el-button>
                  <el-button 
                    v-if="item.status === 'in_progress'" 
                    size="small" 
                    type="success" 
                    @click="completeExam(item)"
                  >
                    完成检查
                  </el-button>
                  <el-button 
                    v-if="item.status === 'completed'" 
                    size="small" 
                    type="primary" 
                    plain
                    @click="openResultDialog(item)"
                  >
                    录入结果
                  </el-button>
                  <el-button 
                    v-if="item.status === 'completed' && !item.report_generated" 
                    size="small" 
                    type="success" 
                    plain
                    @click="generateReport(item)"
                  >
                    生成报告
                  </el-button>
                  <el-button size="small" @click="viewItemDetail(item)">详情</el-button>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="检验结果" name="results">
            <div v-if="examResults.length === 0" class="empty-tip">
              暂无检验结果数据
            </div>
            <div v-else class="results-list">
              <div 
                v-for="result in examResults" 
                :key="result.id" 
                class="result-item"
                :class="result.abnormal_level"
              >
                <div class="result-header">
                  <span class="result-name">{{ result.item_name }}</span>
                  <el-tag v-if="result.result_status === 'normal'" type="success" size="small">正常</el-tag>
                  <el-tag v-else-if="result.abnormal_level === 'critical'" type="danger" effect="dark" size="small">危急</el-tag>
                  <el-tag v-else-if="result.abnormal_level === 'high'" type="warning" size="small">偏高</el-tag>
                  <el-tag v-else-if="result.abnormal_level === 'low'" type="info" size="small">偏低</el-tag>
                </div>
                <div class="result-body">
                  <div class="result-value">
                    <span class="value-num">{{ result.result_value || '--' }}</span>
                    <span class="value-unit">{{ result.result_unit || '' }}</span>
                  </div>
                  <div class="result-range">
                    参考范围：{{ result.normal_range || '无' }}
                  </div>
                </div>
                <div v-if="result.description" class="result-desc">
                  {{ result.description }}
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resultDialogVisible" title="录入检验结果" width="600px">
      <el-form :model="resultForm" label-width="100px" v-if="currentItem">
        <el-form-item label="检查项目">
          <span>{{ currentItem.exam_item_name }}</span>
        </el-form-item>
        <el-form-item label="结果数值">
          <el-input v-model="resultForm.result_value" placeholder="请输入数值结果">
            <template #append>
              <el-select v-model="resultForm.result_unit" placeholder="单位" style="width: 100px">
                <el-option label="mmol/L" value="mmol/L" />
                <el-option label="mg/dL" value="mg/dL" />
                <el-option label="U/L" value="U/L" />
                <el-option label="μmol/L" value="μmol/L" />
                <el-option label="mmHg" value="mmHg" />
                <el-option label="kg/m²" value="kg/m²" />
                <el-option label="次/分" value="次/分" />
              </el-select>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="checkResult.isNormal !== null" label="结果判定">
          <el-tag :type="checkResult.isNormal ? 'success' : 'danger'" size="large">
            {{ checkResult.message }}
          </el-tag>
          <span v-if="!checkResult.isNormal" style="margin-left: 12px; color: #909399; font-size: 12px">
            参考范围：{{ checkResult.range }}
          </span>
        </el-form-item>
        <el-form-item label="异常级别">
          <el-radio-group v-model="resultForm.abnormal_level">
            <el-radio value="normal">正常</el-radio>
            <el-radio value="low">偏低</el-radio>
            <el-radio value="high">偏高</el-radio>
            <el-radio value="critical">危急</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="结果描述">
          <el-input 
            v-model="resultForm.description" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入检查结果描述或备注"
          />
        </el-form-item>
        <el-form-item label="操作人员">
          <el-input v-model="resultForm.operator" placeholder="请输入操作人姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resultDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitResult">提交结果</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="itemDetailVisible" title="检查项目详情" width="500px">
      <div v-if="currentItem" class="item-detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="项目名称">{{ currentItem.exam_item_name }}</el-descriptions-item>
          <el-descriptions-item label="所属科室">{{ currentItem.department }}</el-descriptions-item>
          <el-descriptions-item label="计划时间">
            {{ currentItem.start_time }} - {{ currentItem.end_time }}
          </el-descriptions-item>
          <el-descriptions-item label="检查医生">
            {{ currentItem.doctor_name || '待分配' }}
          </el-descriptions-item>
          <el-descriptions-item label="诊室">{{ currentItem.room || currentItem.equipment_room || '--' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getItemStatusTagType(currentItem.status)" size="small">
              {{ getItemStatusText(currentItem.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.actual_start_time" label="实际开始">
            {{ currentItem.actual_start_time }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.actual_end_time" label="实际结束">
            {{ currentItem.actual_end_time }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentItem.result" label="检查结果" :span="2">
            {{ currentItem.result }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, UserFilled, CircleCheckFilled, Loading, Clock, Document } from '@element-plus/icons-vue'

const loading = ref(false)
const activeTab = ref('patient')
const detailVisible = ref(false)
const detailTab = ref('items')
const currentPatient = ref(null)
const examItems = ref([])
const examResults = ref([])
const resultDialogVisible = ref(false)
const itemDetailVisible = ref(false)
const currentItem = ref(null)
let refreshTimer = null

const patientList = ref([])

const resultForm = reactive({
  result_value: '',
  result_unit: '',
  abnormal_level: 'normal',
  description: '',
  operator: ''
})

const checkResult = computed(() => {
  if (!currentItem.value || !resultForm.result_value) {
    return { isNormal: null, message: '', level: 'normal' }
  }
  const itemCode = currentItem.value.exam_item_code || ''
  const gender = currentPatient.value?.gender || 'all'
  const age = currentPatient.value?.age || 30
  
  if (window.api && window.api.normalRange) {
    return { isNormal: null, message: '', level: 'normal' }
  }
  return { isNormal: null, message: '', level: 'normal' }
})

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
      
      let abnormalCount = 0
      for (const p of data) {
        const items = await window.api.examStatus.getByAppointment(p.id)
        abnormalCount += items.filter(i => i.is_abnormal).length
      }
      overview.abnormal = abnormalCount
      
      const alerts = await window.api.examStatus.getAlerts()
      overview.alerts = alerts.filter(a => a.type !== 'supply').length
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
  if (detailVisible.value && currentPatient.value) {
    loadExamItems(currentPatient.value.id)
  }
}

const loadExamItems = async (appointmentId) => {
  if (window.api) {
    examItems.value = await window.api.examStatus.getByAppointment(appointmentId)
    examResults.value = await window.api.examResult.list(appointmentId)
  } else {
    examItems.value = mockExamItems
    examResults.value = mockExamResults
  }
}

const viewStatus = async (row) => {
  currentPatient.value = row
  await loadExamItems(row.id)
  detailVisible.value = true
}

const onDetailClose = () => {
  currentPatient.value = null
  examItems.value = []
  examResults.value = []
}

const startExam = async (item) => {
  try {
    if (window.api) {
      await window.api.examStatus.update(item.id, 'in_progress', { operator: '护士站' })
    }
    item.status = 'in_progress'
    item.actual_start_time = new Date().toLocaleString()
    
    if (currentPatient.value) {
      if (currentPatient.value.status === 'scheduled') {
        currentPatient.value.status = 'in_progress'
      }
    }
    
    ElMessage.success('已开始检查')
    await loadData()
  } catch (e) {
    ElMessage.error('操作失败: ' + e.message)
  }
}

const completeExam = async (item) => {
  try {
    if (window.api) {
      await window.api.examStatus.update(item.id, 'completed', { operator: '检查医生' })
    }
    item.status = 'completed'
    item.actual_end_time = new Date().toLocaleString()
    
    if (currentPatient.value) {
      currentPatient.value.completed_items = (currentPatient.value.completed_items || 0) + 1
      const total = currentPatient.value.total_items
      if (currentPatient.value.completed_items >= total) {
        currentPatient.value.status = 'all_completed'
      }
    }
    
    ElMessage.success('检查已完成，耗材已自动扣减')
    await loadData()
  } catch (e) {
    ElMessage.error('操作失败: ' + e.message)
  }
}

const generateReport = async (item) => {
  try {
    if (window.api) {
      await window.api.examStatus.update(item.id, 'report_generated', { operator: '检验科' })
    }
    item.report_generated = 1
    item.status = 'report_generated'
    item.report_time = new Date().toLocaleString()
    
    ElMessage.success('报告已生成')
    
    const allReported = examItems.value.every(i => i.report_generated || i.status === 'report_generated')
    if (allReported && currentPatient.value) {
      currentPatient.value.status = 'all_reported'
      ElMessage.success('所有项目报告已生成，已推送至总检医师')
    }
    
    await loadData()
  } catch (e) {
    ElMessage.error('操作失败: ' + e.message)
  }
}

const openResultDialog = (item) => {
  currentItem.value = item
  resultForm.result_value = ''
  resultForm.result_unit = ''
  resultForm.abnormal_level = 'normal'
  resultForm.description = ''
  resultForm.operator = ''
  resultDialogVisible.value = true
}

const submitResult = async () => {
  if (!currentItem.value) return
  
  try {
    if (window.api) {
      await window.api.examResult.create({
        exam_schedule_id: currentItem.value.id,
        appointment_id: currentPatient.value.id,
        exam_item_id: currentItem.value.exam_item_id,
        item_name: currentItem.value.exam_item_name,
        result_value: resultForm.result_value,
        result_unit: resultForm.result_unit,
        result_status: resultForm.abnormal_level === 'normal' ? 'normal' : 'abnormal',
        abnormal_level: resultForm.abnormal_level,
        normal_range: '',
        description: resultForm.description,
        operator: resultForm.operator || '系统'
      })
      
      if (resultForm.abnormal_level !== 'normal') {
        await window.api.examStatus.update(currentItem.value.id, 'completed', {
          is_abnormal: true,
          abnormal_level: resultForm.abnormal_level,
          result: resultForm.result_value
        })
      }
    }
    
    const newResult = {
      id: Date.now(),
      item_name: currentItem.value.exam_item_name,
      result_value: resultForm.result_value,
      result_unit: resultForm.result_unit,
      result_status: resultForm.abnormal_level === 'normal' ? 'normal' : 'abnormal',
      abnormal_level: resultForm.abnormal_level,
      normal_range: '',
      description: resultForm.description
    }
    examResults.value.push(newResult)
    
    if (resultForm.abnormal_level !== 'normal') {
      const item = examItems.value.find(i => i.id === currentItem.value.id)
      if (item) {
        item.is_abnormal = 1
        item.abnormal_level = resultForm.abnormal_level
      }
    }
    
    resultDialogVisible.value = false
    ElMessage.success('结果提交成功')
    await loadData()
  } catch (e) {
    ElMessage.error('提交失败: ' + e.message)
  }
}

const viewItemDetail = (item) => {
  currentItem.value = item
  itemDetailVisible.value = true
}

const getStatusTagType = (status) => {
  const map = {
    'scheduled': 'info',
    'in_progress': 'warning',
    'all_completed': 'success',
    'all_reported': 'primary',
    'chief_reviewed': 'success'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    'scheduled': '待体检',
    'in_progress': '检查中',
    'all_completed': '全部完成',
    'all_reported': '报告已生成',
    'chief_reviewed': '总检完成'
  }
  return map[status] || status
}

const getItemStatusTagType = (status) => {
  const map = {
    'pending': 'info',
    'waiting': 'info',
    'in_progress': 'warning',
    'completed': 'success',
    'report_generated': 'primary'
  }
  return map[status] || 'info'
}

const getItemStatusText = (status) => {
  const map = {
    'pending': '待检查',
    'waiting': '候检中',
    'in_progress': '检查中',
    'completed': '已完成',
    'report_generated': '报告已生成'
  }
  return map[status] || status
}

const getDeptStatusClass = (dept) => {
  if (dept.heat >= 80) return 'busy'
  if (dept.heat >= 50) return 'normal'
  return 'idle'
}

const mockPatients = [
  { id: 1, appointment_no: 'TJ202401150001', name: '张三', gender: 'male', age: 35, package_name: '标准体检套餐B', total_items: 15, completed_items: 15, status: 'all_completed', current_dept: '已完成', first_time: '07:30' },
  { id: 2, appointment_no: 'TJ202401150002', name: '李四', gender: 'female', age: 28, package_name: '基础体检套餐A', total_items: 12, completed_items: 8, status: 'in_progress', current_dept: '超声科', first_time: '07:35' },
  { id: 3, appointment_no: 'TJ202401150003', name: '王五', gender: 'male', age: 45, package_name: '精英体检套餐C', total_items: 18, completed_items: 5, status: 'in_progress', current_dept: '检验科', first_time: '07:40' },
  { id: 4, appointment_no: 'TJ202401150004', name: '赵六', gender: 'female', age: 32, package_name: '标准体检套餐B', total_items: 15, completed_items: 0, status: 'scheduled', current_dept: '', first_time: '07:45' },
  { id: 5, appointment_no: 'TJ202401150005', name: '钱七', gender: 'male', age: 40, package_name: '基础体检套餐A', total_items: 12, completed_items: 10, status: 'in_progress', current_dept: '放射科', first_time: '07:50' }
]

const mockExamItems = [
  { id: 1, exam_item_name: '身高体重', exam_item_code: 'HW', department: '一般检查', status: 'completed', start_time: '07:30', end_time: '07:35', is_abnormal: 0, doctor_name: '张医生', room: '一般-1室' },
  { id: 2, exam_item_name: '血压', exam_item_code: 'BP', department: '一般检查', status: 'completed', start_time: '07:35', end_time: '07:40', is_abnormal: 0, doctor_name: '张医生', room: '一般-1室' },
  { id: 3, exam_item_name: '血常规', exam_item_code: 'CBC', department: '检验科', status: 'completed', start_time: '07:40', end_time: '07:50', is_abnormal: 0, doctor_name: '刘医生', room: '检验-1室' },
  { id: 4, exam_item_name: '肝功能', exam_item_code: 'LIVER', department: '检验科', status: 'completed', start_time: '07:50', end_time: '08:05', is_abnormal: 1, abnormal_level: 'high', doctor_name: '刘医生', room: '检验-1室' },
  { id: 5, exam_item_name: '空腹血糖', exam_item_code: 'FBG', department: '检验科', status: 'completed', start_time: '08:05', end_time: '08:15', is_abnormal: 0, doctor_name: '刘医生', room: '检验-1室' },
  { id: 6, exam_item_name: '腹部彩超', exam_item_code: 'ABD_US', department: '超声科', status: 'in_progress', start_time: '08:20', end_time: '08:40', is_abnormal: 0, doctor_name: '王医生', room: '超声-1室' },
  { id: 7, exam_item_name: '心电图', exam_item_code: 'ECG', department: '功能科', status: 'pending', start_time: '08:40', end_time: '08:50', is_abnormal: 0, doctor_name: '陈医生', room: '心电-1室' },
  { id: 8, exam_item_name: '胸部CT', exam_item_code: 'CHEST_CT', department: '放射科', status: 'pending', start_time: '09:00', end_time: '09:15', is_abnormal: 0, doctor_name: '赵医生', room: 'CT-1室' }
]

const mockExamResults = [
  { id: 1, item_name: '身高体重', result_value: '175/70', result_unit: 'cm/kg', result_status: 'normal', abnormal_level: 'normal', description: '身高体重正常，BMI 22.9' },
  { id: 2, item_name: '血压', result_value: '120/80', result_unit: 'mmHg', result_status: 'normal', abnormal_level: 'normal', description: '血压正常' },
  { id: 3, item_name: '肝功能-ALT', result_value: '52', result_unit: 'U/L', result_status: 'abnormal', abnormal_level: 'high', normal_range: '0-40 U/L', description: '谷丙转氨酶偏高，建议复查' }
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
  margin-bottom: 16px;
}

.patient-header h3 {
  font-size: 20px;
  color: #303133;
  margin-bottom: 4px;
}

.patient-header p {
  color: #909399;
  font-size: 14px;
  margin: 0;
}

.progress-bar-row {
  margin-bottom: 16px;
}

.progress-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.detail-tabs {
  margin-top: 10px;
}

.exam-items-list {
  max-height: 400px;
  overflow-y: auto;
}

.exam-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.exam-item-row.completed {
  background: #f0f9eb;
}

.exam-item-row.in_progress {
  background: #fdf6ec;
}

.exam-item-row.report_generated {
  background: #ecf5ff;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.item-name {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.item-center {
  flex: 1;
  text-align: center;
  font-size: 13px;
  color: #909399;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-dept {
  font-size: 12px;
  color: #606266;
}

.item-time {
  font-size: 12px;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.rotating {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.results-list {
  max-height: 400px;
  overflow-y: auto;
}

.result-item {
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  border-left: 4px solid #e4e7ed;
  background: #fafafa;
}

.result-item.normal {
  border-left-color: #67c23a;
  background: #f0f9eb;
}

.result-item.high,
.result-item.low {
  border-left-color: #e6a23c;
  background: #fdf6ec;
}

.result-item.critical {
  border-left-color: #f56c6c;
  background: #fef0f0;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.result-name {
  font-weight: 600;
  color: #303133;
  font-size: 15px;
}

.result-body {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.value-num {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.value-unit {
  font-size: 14px;
  color: #909399;
  margin-left: 4px;
}

.result-range {
  font-size: 13px;
  color: #909399;
}

.result-desc {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #dcdfe6;
  color: #606266;
  font-size: 13px;
}

.empty-tip {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.item-detail-content {
  padding: 10px 0;
}
</style>
