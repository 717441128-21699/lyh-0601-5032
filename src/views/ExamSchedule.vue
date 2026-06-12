<template>
  <div class="exam-schedule">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="card-title">智能排程</span>
            <el-radio-group v-model="activeTab" size="default" class="tab-radio">
              <el-radio-button label="schedule">排程视图</el-radio-button>
              <el-radio-button label="adjustment">
                调整审批
                <el-badge v-if="pendingAdjustCount > 0" :value="pendingAdjustCount" class="adjust-badge" />
              </el-radio-button>
            </el-radio-group>
          </div>
          <div class="header-actions">
            <el-date-picker
              v-model="scheduleDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 180px"
              @change="handleDateChange"
            />
            <template v-if="activeTab === 'schedule'">
              <el-button type="primary" @click="generateSchedule" :loading="generating">
                <el-icon><MagicStick /></el-icon>智能生成排程
              </el-button>
              <el-button 
                v-if="hasPendingApproval" 
                type="success" 
                @click="approveSchedule"
              >
                <el-icon><Check /></el-icon>主任审批
              </el-button>
            </template>
          </div>
        </div>
      </template>

      <div v-if="activeTab === 'schedule'">
        <el-empty v-if="scheduleList.length === 0 && !loading" description="暂无排程数据，请点击'智能生成排程'" />
        
        <div v-else>
          <div class="schedule-summary">
            <el-row :gutter="20">
              <el-col :span="4">
                <div class="summary-item">
                  <span class="label">受检人数</span>
                  <span class="value">{{ scheduleList.length }} 人</span>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="summary-item">
                  <span class="label">检查项目总数</span>
                  <span class="value">{{ totalItems }} 项</span>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="summary-item">
                  <span class="label">待审批</span>
                  <span class="value status-pending">{{ pendingApprovalCount }}</span>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="summary-item">
                  <span class="label">待科室确认</span>
                  <span class="value status-warning">{{ pendingConfirmCount }}</span>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="summary-item">
                  <span class="label">已确认</span>
                  <span class="value status-success">{{ confirmedCount }}</span>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="summary-item">
                  <span class="label">调整待审批</span>
                  <span class="value status-danger">{{ adjustPendingCount }}</span>
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
                    v-for="item in row.items" 
                    :key="item.id" 
                    class="timeline-item"
                    :class="{ 
                      'is-fasting': item.require_fasting,
                      'is-completed': item.status === 'dept_confirmed',
                      'is-progress': item.status === 'adjust_pending' || item.status === 'adjusting',
                      'is-pending': item.status === 'pending_approval' || item.status === 'approved_pending_confirm'
                    }"
                    :title="`${item.exam_item_name} | ${item.start_time}-${item.end_time} | ${item.room || item.department}`"
                  >
                    <div class="item-status">
                      <el-tag :type="getStatusType(item.status)" size="small" effect="dark">
                        {{ getStatusText(item.status) }}
                      </el-tag>
                    </div>
                    <div class="item-time">{{ item.start_time }}</div>
                    <div class="item-name">{{ item.exam_item_name }}</div>
                    <div class="item-room">{{ item.room || item.department }}</div>
                    <el-tag 
                      v-if="item.require_fasting" 
                      size="small" 
                      type="warning" 
                      class="item-tag"
                    >空腹</el-tag>
                    <div class="item-actions">
                      <el-button 
                        v-if="item.status === 'approved_pending_confirm'" 
                        type="success" 
                        size="small" 
                        @click.stop="handleDeptConfirm(item, row)"
                      >确认接收</el-button>
                      <el-button 
                        v-if="item.status === 'dept_confirmed' || item.status === 'approved_pending_confirm'" 
                        type="warning" 
                        size="small" 
                        @click.stop="openAdjustDialog(item, row)"
                      >调整</el-button>
                    </div>
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
      </div>

      <div v-else>
        <div class="adjustment-header">
          <el-radio-group v-model="adjustFilterStatus" size="default" @change="loadAdjustments">
            <el-radio-button label="pending">待审批</el-radio-button>
            <el-radio-button label="approved">已通过</el-radio-button>
            <el-radio-button label="rejected">已驳回</el-radio-button>
            <el-radio-button label="all">全部</el-radio-button>
          </el-radio-group>
        </div>

        <el-table :data="adjustmentList" v-loading="adjustLoading" stripe>
          <el-table-column prop="id" label="申请编号" width="120" />
          <el-table-column prop="patient_name" label="姓名" width="80" />
          <el-table-column prop="exam_item_name" label="检查项目" width="120" />
          <el-table-column label="原排程" width="200">
            <template #default="{ row }">
              <div class="schedule-info">
                <div class="info-row">
                  <span class="info-label">时间：</span>
                  <span>{{ row.original_start_time }} - {{ row.original_end_time }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">诊室：</span>
                  <span>{{ row.original_room }}</span>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="申请调整" width="200">
            <template #default="{ row }">
              <div class="schedule-info new-schedule">
                <div class="info-row">
                  <span class="info-label">时间：</span>
                  <span class="highlight">{{ row.new_start_time }} - {{ row.new_end_time }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">诊室：</span>
                  <span class="highlight">{{ row.new_room }}</span>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="申请原因" min-width="150" show-overflow-tooltip />
          <el-table-column prop="apply_time" label="申请时间" width="160" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getAdjustStatusType(row.status)" size="small">
                {{ getAdjustStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="审批备注" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.approve_remark || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <template v-if="row.status === 'pending'">
                <el-button type="success" size="small" @click="approveAdjustment(row, true)">通过</el-button>
                <el-button type="danger" size="small" @click="approveAdjustment(row, false)">驳回</el-button>
              </template>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="排程详情" width="800px">
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
          <el-table-column prop="room" label="诊室" width="100" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="空腹" width="70">
            <template #default="{ row }">
              <el-tag v-if="row.require_fasting" size="small" type="warning">是</el-tag>
              <span v-else style="color: #c0c4cc">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button 
                v-if="row.status === 'approved_pending_confirm'" 
                type="success" 
                size="small" 
                @click="handleDeptConfirm(row, currentSchedule)"
              >确认接收</el-button>
              <el-button 
                v-if="row.status === 'dept_confirmed' || row.status === 'approved_pending_confirm'" 
                type="warning" 
                size="small" 
                @click="openAdjustDialog(row, currentSchedule)"
              >申请调整</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="adjustDialogVisible" title="调整申请" width="500px" :close-on-click-modal="false">
      <el-form 
        ref="adjustFormRef" 
        :model="adjustForm" 
        :rules="adjustRules" 
        label-width="100px"
      >
        <el-form-item label="检查项目">
          <span>{{ adjustForm.exam_item_name }}</span>
        </el-form-item>
        <el-form-item label="原开始时间">
          <span>{{ adjustForm.original_start_time }}</span>
        </el-form-item>
        <el-form-item label="原结束时间">
          <span>{{ adjustForm.original_end_time }}</span>
        </el-form-item>
        <el-form-item label="原诊室">
          <span>{{ adjustForm.original_room }}</span>
        </el-form-item>
        <el-form-item label="新开始时间" prop="new_start_time">
          <el-time-picker
            v-model="adjustForm.new_start_time"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="选择开始时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="新结束时间" prop="new_end_time">
          <el-time-picker
            v-model="adjustForm.new_end_time"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="选择结束时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="新诊室" prop="new_room">
          <el-input v-model="adjustForm.new_room" placeholder="请输入新诊室" />
        </el-form-item>
        <el-form-item label="申请原因" prop="reason">
          <el-input 
            v-model="adjustForm.reason" 
            type="textarea" 
            :rows="3" 
            placeholder="请输入调整原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdjust" :loading="submittingAdjust">提交申请</el-button>
      </template>
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
const activeTab = ref('schedule')

const adjustDialogVisible = ref(false)
const adjustFormRef = ref(null)
const submittingAdjust = ref(false)
const currentAdjustItem = ref(null)
const currentAdjustSchedule = ref(null)
const adjustForm = ref({
  item_id: null,
  appointment_id: null,
  exam_item_name: '',
  original_start_time: '',
  original_end_time: '',
  original_room: '',
  new_start_time: '',
  new_end_time: '',
  new_room: '',
  reason: ''
})

const adjustRules = {
  new_start_time: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  new_end_time: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  new_room: [{ required: true, message: '请输入新诊室', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入申请原因', trigger: 'blur' }]
}

const adjustmentList = ref([])
const adjustLoading = ref(false)
const adjustFilterStatus = ref('pending')

const totalItems = computed(() => {
  return scheduleList.value.reduce((sum, s) => sum + s.items.length, 0)
})

const allItems = computed(() => {
  const items = []
  scheduleList.value.forEach(s => {
    s.items.forEach(item => {
      items.push(item)
    })
  })
  return items
})

const pendingApprovalCount = computed(() => {
  return allItems.value.filter(item => item.status === 'pending_approval').length
})

const pendingConfirmCount = computed(() => {
  return allItems.value.filter(item => item.status === 'approved_pending_confirm').length
})

const confirmedCount = computed(() => {
  return allItems.value.filter(item => item.status === 'dept_confirmed').length
})

const adjustPendingCount = computed(() => {
  return allItems.value.filter(item => item.status === 'adjust_pending').length
})

const hasPendingApproval = computed(() => {
  return pendingApprovalCount.value > 0
})

const pendingAdjustCount = computed(() => {
  return adjustmentList.value.filter(item => item.status === 'pending').length
})

const getStatusType = (status) => {
  const typeMap = {
    'pending_approval': 'info',
    'approved_pending_confirm': 'warning',
    'dept_confirmed': 'success',
    'adjust_pending': 'danger',
    'adjusting': 'warning'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'pending_approval': '待审批',
    'approved_pending_confirm': '已审批待确认',
    'dept_confirmed': '科室已确认',
    'adjust_pending': '调整待审批',
    'adjusting': '调整中'
  }
  return textMap[status] || '未知'
}

const getAdjustStatusType = (status) => {
  const typeMap = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger'
  }
  return typeMap[status] || 'info'
}

const getAdjustStatusText = (status) => {
  const textMap = {
    'pending': '待审批',
    'approved': '已通过',
    'rejected': '已驳回'
  }
  return textMap[status] || '未知'
}

const handleDateChange = () => {
  if (activeTab.value === 'schedule') {
    loadSchedule()
  } else {
    loadAdjustments()
  }
}

const loadSchedule = async () => {
  loading.value = true
  try {
    if (window.api && window.api.examSchedule) {
      scheduleList.value = await window.api.examSchedule.list(scheduleDate.value)
    } else {
      scheduleList.value = mockSchedules
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('加载排程数据失败')
  } finally {
    loading.value = false
  }
}

const loadAdjustments = async () => {
  adjustLoading.value = true
  try {
    const params = { date: scheduleDate.value }
    if (adjustFilterStatus.value !== 'all') {
      params.status = adjustFilterStatus.value
    }
    
    if (window.api && window.api.adjustment) {
      adjustmentList.value = await window.api.adjustment.list(params)
    } else {
      if (adjustFilterStatus.value === 'all') {
        adjustmentList.value = mockAdjustments
      } else {
        adjustmentList.value = mockAdjustments.filter(a => a.status === adjustFilterStatus.value)
      }
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('加载调整申请失败')
  } finally {
    adjustLoading.value = false
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
    if (window.api && window.api.examSchedule) {
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
      ElMessage.success('排程生成成功，共 4 位受检者，32 项检查')
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
      `确定要审批通过当前待审批的 ${pendingApprovalCount.value} 项排程吗？审批通过后将推送至各科室终端。`,
      '主任审批',
      { type: 'warning' }
    )
    
    if (window.api && window.api.examSchedule) {
      await window.api.examSchedule.approve(scheduleDate.value, 'approved')
    }
    
    scheduleList.value.forEach(s => {
      s.items.forEach(item => {
        if (item.status === 'pending_approval') {
          item.status = 'approved_pending_confirm'
        }
      })
    })
    
    ElMessage.success('审批通过，已推送至各科室')
    loadAdjustments()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

const handleDeptConfirm = async (item, schedule) => {
  try {
    await ElMessageBox.confirm(
      `确定确认接收「${item.exam_item_name}」排程吗？`,
      '科室确认',
      { type: 'info' }
    )
    
    if (window.api && window.api.examSchedule) {
      await window.api.examSchedule.deptConfirm(item.id, 'confirmed')
    }
    
    item.status = 'dept_confirmed'
    ElMessage.success('确认成功')
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

const openAdjustDialog = (item, schedule) => {
  currentAdjustItem.value = item
  currentAdjustSchedule.value = schedule
  adjustForm.value = {
    item_id: item.id,
    appointment_id: schedule.appointment_id,
    patient_name: schedule.patient_name,
    exam_item_name: item.exam_item_name,
    original_start_time: item.start_time,
    original_end_time: item.end_time,
    original_room: item.room,
    new_start_time: item.start_time,
    new_end_time: item.end_time,
    new_room: item.room,
    reason: ''
  }
  adjustDialogVisible.value = true
}

const submitAdjust = async () => {
  if (!adjustFormRef.value) return
  
  try {
    await adjustFormRef.value.validate()
  } catch (e) {
    return
  }
  
  try {
    submittingAdjust.value = true
    
    const data = {
      item_id: adjustForm.value.item_id,
      appointment_id: adjustForm.value.appointment_id,
      patient_name: adjustForm.value.patient_name,
      exam_item_name: adjustForm.value.exam_item_name,
      original_start_time: adjustForm.value.original_start_time,
      original_end_time: adjustForm.value.original_end_time,
      original_room: adjustForm.value.original_room,
      new_start_time: adjustForm.value.new_start_time,
      new_end_time: adjustForm.value.new_end_time,
      new_room: adjustForm.value.new_room,
      reason: adjustForm.value.reason,
      scheduled_date: scheduleDate.value
    }
    
    if (window.api && window.api.adjustment) {
      await window.api.adjustment.create(data)
    } else {
      await new Promise(r => setTimeout(r, 800))
      const newAdjustment = {
        id: 'ADJ' + Date.now(),
        ...data,
        status: 'pending',
        apply_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        approver: '',
        approve_time: '',
        approve_remark: ''
      }
      mockAdjustments.unshift(newAdjustment)
    }
    
    if (currentAdjustItem.value) {
      currentAdjustItem.value.status = 'adjust_pending'
    }
    
    ElMessage.success('调整申请已提交，等待审批')
    adjustDialogVisible.value = false
    loadAdjustments()
  } catch (e) {
    console.error(e)
    ElMessage.error('提交失败，请重试')
  } finally {
    submittingAdjust.value = false
  }
}

const approveAdjustment = async (adjustment, approved) => {
  const action = approved ? '通过' : '驳回'
  
  try {
    let remark = ''
    if (!approved) {
      const { value } = await ElMessageBox.prompt(
        `请输入${action}原因`,
        `${action}调整申请`,
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputPlaceholder: '请输入原因',
          inputType: 'textarea',
          inputValidator: (val) => {
            if (!val || val.trim() === '') {
              return '请输入原因'
            }
            return true
          }
        }
      )
      remark = value
    } else {
      await ElMessageBox.confirm(
        `确定要${action}「${adjustment.exam_item_name}」的调整申请吗？`,
        `${action}调整申请`,
        { type: approved ? 'success' : 'warning' }
      )
    }
    
    if (window.api && window.api.adjustment) {
      await window.api.adjustment.approve(adjustment.id, approved, remark)
    } else {
      const item = mockAdjustments.find(a => a.id === adjustment.id)
      if (item) {
        item.status = approved ? 'approved' : 'rejected'
        item.approve_remark = remark
        item.approve_time = dayjs().format('YYYY-MM-DD HH:mm:ss')
        item.approver = '张主任'
      }
    }
    
    if (approved) {
      scheduleList.value.forEach(s => {
        const targetItem = s.items.find(item => item.id === adjustment.item_id)
        if (targetItem) {
          targetItem.start_time = adjustment.new_start_time
          targetItem.end_time = adjustment.new_end_time
          targetItem.room = adjustment.new_room
          targetItem.status = 'dept_confirmed'
        }
      })
    } else {
      scheduleList.value.forEach(s => {
        const targetItem = s.items.find(item => item.id === adjustment.item_id)
        if (targetItem) {
          targetItem.status = 'dept_confirmed'
        }
      })
    }
    
    ElMessage.success(`${action}成功`)
    loadAdjustments()
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('操作失败')
    }
  }
}

const viewDetail = (row) => {
  currentSchedule.value = row
  detailVisible.value = true
}

const createMockItems = (baseId, timeOffset = 0) => {
  const baseItems = [
    { exam_item_name: '身高体重', department: '一般检查', start_time: '07:30', end_time: '07:35', standard_duration: 5, require_fasting: 0, doctor_name: '张医生', equipment_name: null, room: '一般检查室', sort_order: 0, status: 'pending_approval' },
    { exam_item_name: '血压', department: '一般检查', start_time: '07:35', end_time: '07:40', standard_duration: 5, require_fasting: 0, doctor_name: '张医生', equipment_name: null, room: '一般检查室', sort_order: 1, status: 'pending_approval' },
    { exam_item_name: '血常规', department: '检验科', start_time: '07:40', end_time: '07:50', standard_duration: 10, require_fasting: 1, doctor_name: '刘医生', equipment_name: null, room: '采血室', sort_order: 2, status: 'pending_approval' },
    { exam_item_name: '肝功能', department: '检验科', start_time: '07:50', end_time: '08:05', standard_duration: 15, require_fasting: 1, doctor_name: '刘医生', equipment_name: null, room: '采血室', sort_order: 3, status: 'pending_approval' },
    { exam_item_name: '空腹血糖', department: '检验科', start_time: '08:05', end_time: '08:15', standard_duration: 10, require_fasting: 1, doctor_name: '刘医生', equipment_name: null, room: '采血室', sort_order: 4, status: 'pending_approval' },
    { exam_item_name: '腹部彩超', department: '超声科', start_time: '08:15', end_time: '08:35', standard_duration: 20, require_fasting: 1, doctor_name: '王医生', equipment_name: '彩超机1', room: '超声-1室', sort_order: 5, status: 'pending_approval' },
    { exam_item_name: '心电图', department: '功能科', start_time: '08:35', end_time: '08:45', standard_duration: 10, require_fasting: 0, doctor_name: '陈医生', equipment_name: '心电图机1', room: '心电-1室', sort_order: 6, status: 'pending_approval' },
    { exam_item_name: '胸部CT', department: '放射科', start_time: '08:45', end_time: '09:00', standard_duration: 15, require_fasting: 0, doctor_name: '赵医生', equipment_name: 'CT机', room: 'CT-1室', sort_order: 7, status: 'pending_approval' }
  ]
  
  return baseItems.map((item, index) => {
    const startTime = dayjs(`2024-01-15 ${item.start_time}`).add(timeOffset, 'minute').format('HH:mm')
    const endTime = dayjs(`2024-01-15 ${item.end_time}`).add(timeOffset, 'minute').format('HH:mm')
    return {
      ...item,
      id: baseId + index,
      start_time: startTime,
      end_time: endTime
    }
  })
}

const mockSchedules = [
  { 
    appointment_id: 1, 
    appointment_no: 'TJ202401150001', 
    patient_name: '张三', 
    gender: 'male', 
    scheduled_date: '2024-01-15',
    approval_status: 'approved',
    items: (() => {
      const items = createMockItems(1, 0)
      items.forEach((item, idx) => {
        if (idx < 3) {
          item.status = 'dept_confirmed'
        } else if (idx < 6) {
          item.status = 'approved_pending_confirm'
        } else if (idx < 7) {
          item.status = 'adjust_pending'
        } else {
          item.status = 'pending_approval'
        }
      })
      return items
    })()
  },
  { 
    appointment_id: 2, 
    appointment_no: 'TJ202401150002', 
    patient_name: '李四', 
    gender: 'female', 
    scheduled_date: '2024-01-15',
    approval_status: 'approved',
    items: (() => {
      const items = createMockItems(100, 5)
      items.forEach(item => {
        item.status = 'approved_pending_confirm'
      })
      return items
    })()
  },
  { 
    appointment_id: 3, 
    appointment_no: 'TJ202401150003', 
    patient_name: '王五', 
    gender: 'male', 
    scheduled_date: '2024-01-15',
    approval_status: 'approved',
    items: (() => {
      const items = createMockItems(200, 10)
      items.forEach(item => {
        item.status = 'dept_confirmed'
      })
      return items
    })()
  },
  { 
    appointment_id: 4, 
    appointment_no: 'TJ202401150004', 
    patient_name: '赵六', 
    gender: 'female', 
    scheduled_date: '2024-01-15',
    approval_status: 'pending',
    items: (() => {
      const items = createMockItems(300, 15)
      items.forEach(item => {
        item.status = 'pending_approval'
      })
      return items
    })()
  }
]

const mockAdjustments = [
  {
    id: 'ADJ20240115001',
    item_id: 7,
    appointment_id: 1,
    patient_name: '张三',
    exam_item_name: '心电图',
    original_start_time: '08:35',
    original_end_time: '08:45',
    original_room: '心电-1室',
    new_start_time: '09:30',
    new_end_time: '09:40',
    new_room: '心电-2室',
    reason: '设备临时故障，需要调换到心电-2室',
    status: 'pending',
    apply_time: '2024-01-15 08:20:00',
    approver: '',
    approve_time: '',
    approve_remark: ''
  },
  {
    id: 'ADJ20240115002',
    item_id: 105,
    appointment_id: 2,
    patient_name: '李四',
    exam_item_name: '腹部彩超',
    original_start_time: '08:20',
    original_end_time: '08:40',
    original_room: '超声-1室',
    new_start_time: '10:00',
    new_end_time: '10:20',
    new_room: '超声-3室',
    reason: '患者申请下午检查，与医生协商后改期',
    status: 'approved',
    apply_time: '2024-01-15 07:50:00',
    approver: '张主任',
    approve_time: '2024-01-15 08:00:00',
    approve_remark: '同意调整，请科室做好衔接'
  },
  {
    id: 'ADJ20240115003',
    item_id: 203,
    appointment_id: 3,
    patient_name: '王五',
    exam_item_name: '肝功能',
    original_start_time: '08:00',
    original_end_time: '08:15',
    original_room: '采血室',
    new_start_time: '09:00',
    new_end_time: '09:15',
    new_room: '采血室',
    reason: '患者早上进食了，需要改时间',
    status: 'rejected',
    apply_time: '2024-01-15 07:45:00',
    approver: '张主任',
    approve_time: '2024-01-15 07:55:00',
    approve_remark: '肝功能检查必须空腹，建议改日再来'
  }
]

onMounted(() => {
  loadSchedule()
  loadAdjustments()
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

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.tab-radio {
  margin-left: 8px;
}

.adjust-badge {
  margin-left: 6px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
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

.summary-item .value.status-pending {
  color: #909399;
}

.summary-item .value.status-warning {
  color: #e6a23c;
}

.summary-item .value.status-success {
  color: #67c23a;
}

.summary-item .value.status-danger {
  color: #f56c6c;
}

.timeline-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 0;
}

.timeline-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 10px 12px;
  background: #ecf5ff;
  border-radius: 8px;
  min-width: 120px;
  position: relative;
  border-left: 3px solid #409eff;
  gap: 4px;
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

.timeline-item.is-pending {
  background: #f4f4f5;
  border-left-color: #909399;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.item-status {
  margin-bottom: 4px;
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

.item-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #dcdfe6;
}

.item-actions .el-button {
  flex: 1;
  padding: 4px 8px;
  font-size: 12px;
}

.patient-info {
  margin-bottom: 16px;
}

.adjustment-header {
  margin-bottom: 16px;
}

.schedule-info {
  font-size: 12px;
  line-height: 1.8;
}

.schedule-info .info-row {
  display: flex;
  align-items: flex-start;
}

.schedule-info .info-label {
  color: #909399;
  flex-shrink: 0;
}

.schedule-info.new-schedule .highlight {
  color: #409eff;
  font-weight: 500;
}

.text-muted {
  color: #c0c4cc;
}

.schedule-detail {
  padding: 8px 0;
}
</style>
