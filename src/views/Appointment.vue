<template>
  <div class="appointment-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>预约登记管理</span>
          <div class="header-actions">
            <el-date-picker
              v-model="filterDate"
              type="date"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width: 160px"
              @change="loadData"
            />
            <el-button type="primary" @click="openDialog">
              <el-icon><Plus /></el-icon>新增预约
            </el-button>
          </div>
        </div>
      </template>
      
      <div class="filter-bar">
        <el-input v-model="keyword" placeholder="搜索姓名/体检号/电话" style="width: 280px" clearable @input="loadData">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width: 140px" @change="loadData">
          <el-option label="待体检" value="scheduled" />
          <el-option label="检查中" value="in_progress" />
          <el-option label="已完成" value="all_completed" />
        </el-select>
      </div>
      
      <el-table :data="appointmentList" v-loading="loading" stripe>
        <el-table-column prop="appointment_no" label="体检号" width="140" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="gender" label="性别" width="60">
          <template #default="{ row }">
            {{ row.gender === 'male' ? '男' : '女' }}
          </template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="60" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="package_name" label="体检套餐" />
        <el-table-column prop="appointment_date" label="预约日期" width="110" />
        <el-table-column prop="time_slot" label="时段" width="100">
          <template #default="{ row }">
            <span>{{ row.time_slot || '全天' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'scheduled'" type="info" size="small">待体检</el-tag>
            <el-tag v-else-if="row.status === 'in_progress'" type="warning" size="small">检查中</el-tag>
            <el-tag v-else-if="row.status === 'all_completed'" type="success" size="small">已完成</el-tag>
            <el-tag v-else type="info" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
            <el-button type="primary" link size="small" @click="openDialog(row)">编辑</el-button>
            <el-button v-if="row.status === 'scheduled'" type="danger" link size="small" @click="removeAppointment(row)">取消</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑预约' : '新增预约'" width="560px">
      <el-form :model="formData" label-width="100px" ref="formRef">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="formData.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="formData.gender">
                <el-radio value="male">男</el-radio>
                <el-radio value="female">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="年龄" prop="age">
              <el-input-number v-model="formData.age" :min="0" :max="120" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证号">
              <el-input v-model="formData.id_card" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="formData.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="体检套餐" prop="package_id">
              <el-select v-model="formData.package_id" placeholder="请选择套餐" style="width: 100%">
                <el-option 
                  v-for="pkg in packageList" 
                  :key="pkg.id" 
                  :label="pkg.name" 
                  :value="pkg.id"
                >
                  <span>{{ pkg.name }}</span>
                  <span style="float: right; color: #f56c6c">¥{{ pkg.price }}</span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预约日期" prop="appointment_date">
              <el-date-picker 
                v-model="formData.appointment_date" 
                type="date" 
                value-format="YYYY-MM-DD"
                placeholder="选择日期" 
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="时段">
              <el-select v-model="formData.time_slot" placeholder="选择时段" clearable style="width: 100%">
                <el-option label="上午" value="上午" />
                <el-option label="下午" value="下午" />
                <el-option label="全天" value="全天" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="空腹">
              <el-switch v-model="formData.fasting" />
              <span style="margin-left: 8px; color: #909399">需空腹检查</span>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="formData.notes" type="textarea" :rows="2" placeholder="请输入备注信息" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="预约详情" width="600px">
      <div v-if="currentAppointment" class="appointment-detail">
        <div class="detail-header">
          <el-tag size="large" type="primary">{{ currentAppointment.appointment_no }}</el-tag>
          <el-tag :type="currentAppointment.status === 'scheduled' ? 'info' : 'success'" size="large">
            {{ currentAppointment.status === 'scheduled' ? '待体检' : currentAppointment.status }}
          </el-tag>
        </div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ currentAppointment.name }}</el-descriptions-item>
          <el-descriptions-item label="性别">
            {{ currentAppointment.gender === 'male' ? '男' : '女' }}
          </el-descriptions-item>
          <el-descriptions-item label="年龄">{{ currentAppointment.age || '-' }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ currentAppointment.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="体检套餐">{{ currentAppointment.package_name }}</el-descriptions-item>
          <el-descriptions-item label="预约日期">{{ currentAppointment.appointment_date }}</el-descriptions-item>
          <el-descriptions-item label="空腹">
            {{ currentAppointment.fasting ? '是' : '否' }}
          </el-descriptions-item>
          <el-descriptions-item label="时段">{{ currentAppointment.time_slot || '全天' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            {{ currentAppointment.notes || '无' }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="package-items">
          <h4>包含项目</h4>
          <div class="item-tags">
            <el-tag 
              v-for="item in currentAppointment.package_items" 
              :key="item.id" 
              :type="item.require_fasting ? 'warning' : 'info'"
              style="margin: 4px"
            >
              {{ item.name }}
            </el-tag>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const loading = ref(false)
const dialogVisible = ref(false)
const detailVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const appointmentList = ref([])
const packageList = ref([])
const keyword = ref('')
const statusFilter = ref('')
const filterDate = ref(dayjs().format('YYYY-MM-DD'))
const currentAppointment = ref(null)

const formData = reactive({
  id: null,
  name: '',
  gender: 'male',
  age: 30,
  id_card: '',
  phone: '',
  package_id: null,
  appointment_date: dayjs().format('YYYY-MM-DD'),
  time_slot: '',
  fasting: true,
  notes: ''
})

const loadData = async () => {
  loading.value = true
  try {
    if (window.api) {
      const params = {
        date: filterDate.value || undefined,
        status: statusFilter.value || undefined,
        keyword: keyword.value || undefined
      }
      appointmentList.value = await window.api.appointment.list(params)
    } else {
      appointmentList.value = mockAppointments
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadPackages = async () => {
  try {
    if (window.api) {
      packageList.value = await window.api.package.list()
    } else {
      packageList.value = mockPackages
    }
  } catch (e) {
    console.error(e)
  }
}

const openDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    Object.assign(formData, row)
    formData.fasting = !!row.fasting
  } else {
    Object.assign(formData, {
      id: null,
      name: '',
      gender: 'male',
      age: 30,
      id_card: '',
      phone: '',
      package_id: packageList.value[0]?.id || null,
      appointment_date: dayjs().format('YYYY-MM-DD'),
      time_slot: '',
      fasting: true,
      notes: ''
    })
  }
  dialogVisible.value = true
}

const viewDetail = async (row) => {
  try {
    if (window.api) {
      currentAppointment.value = await window.api.appointment.get(row.id)
    } else {
      currentAppointment.value = {
        ...row,
        package_items: mockItems
      }
    }
    detailVisible.value = true
  } catch (e) {
    console.error(e)
  }
}

const submitForm = async () => {
  try {
    if (isEdit.value) {
      if (window.api) {
        await window.api.appointment.update(formData.id, formData)
      }
      ElMessage.success('更新成功')
    } else {
      if (window.api) {
        await window.api.appointment.create(formData)
      }
      ElMessage.success('预约成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  }
}

const removeAppointment = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要取消 ${row.name} 的预约吗？`, '提示', { type: 'warning' })
    if (window.api) {
      await window.api.appointment.remove(row.id)
    }
    ElMessage.success('已取消')
    loadData()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

const mockPackages = [
  { id: 1, name: '基础体检套餐A', price: 580 },
  { id: 2, name: '标准体检套餐B', price: 1280 },
  { id: 3, name: '精英体检套餐C', price: 2580 }
]

const mockItems = [
  { id: 1, name: '身高体重', require_fasting: false },
  { id: 2, name: '血压', require_fasting: false },
  { id: 3, name: '血常规', require_fasting: true },
  { id: 4, name: '肝功能', require_fasting: true },
  { id: 9, name: '心电图', require_fasting: false },
  { id: 10, name: '胸部CT', require_fasting: false }
]

const mockAppointments = [
  { id: 1, appointment_no: 'TJ202401150001', name: '张三', gender: 'male', age: 35, phone: '13800000001', package_name: '标准体检套餐B', appointment_date: '2024-01-15', time_slot: '上午', status: 'scheduled', fasting: 1, notes: '' },
  { id: 2, appointment_no: 'TJ202401150002', name: '李四', gender: 'female', age: 28, phone: '13800000002', package_name: '基础体检套餐A', appointment_date: '2024-01-15', time_slot: '上午', status: 'in_progress', fasting: 1, notes: '' },
  { id: 3, appointment_no: 'TJ202401150003', name: '王五', gender: 'male', age: 45, phone: '13800000003', package_name: '精英体检套餐C', appointment_date: '2024-01-15', time_slot: '上午', status: 'scheduled', fasting: 1, notes: '' },
  { id: 4, appointment_no: 'TJ202401150004', name: '赵六', gender: 'female', age: 32, phone: '13800000004', package_name: '标准体检套餐B', appointment_date: '2024-01-15', time_slot: '下午', status: 'scheduled', fasting: 0, notes: '' }
]

onMounted(() => {
  loadPackages()
  loadData()
})
</script>

<style scoped>
.appointment-page {
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

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-header {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.package-items {
  margin-top: 20px;
}

.package-items h4 {
  margin-bottom: 12px;
  color: #303133;
}

.item-tags {
  display: flex;
  flex-wrap: wrap;
}
</style>
