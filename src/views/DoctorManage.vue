<template>
  <div class="doctor-manage">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>医生排班管理</span>
          <div class="header-actions">
            <el-date-picker
              v-model="currentDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 160px"
              @change="loadSchedule"
            />
            <el-button type="primary" @click="openDoctorDialog">
              <el-icon><Plus /></el-icon>新增医生
            </el-button>
            <el-button type="success" @click="openScheduleDialog">
              <el-icon><CalendarPlus /></el-icon>添加排班
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="scheduleList" v-loading="loading" stripe>
        <el-table-column prop="schedule_date" label="日期" width="120" />
        <el-table-column prop="doctor_name" label="医生姓名" width="100" />
        <el-table-column prop="title" label="职称" width="100" />
        <el-table-column prop="department" label="科室" width="100" />
        <el-table-column prop="exam_item_name" label="负责项目" width="120">
          <template #default="{ row }">
            {{ row.exam_item_name || '全科' }}
          </template>
        </el-table-column>
        <el-table-column prop="start_time" label="开始时间" width="100" />
        <el-table-column prop="end_time" label="结束时间" width="100" />
        <el-table-column prop="shift_type" label="班次" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.shift_type === 'morning'" size="small" type="success">早班</el-tag>
            <el-tag v-else-if="row.shift_type === 'afternoon'" size="small" type="warning">午班</el-tag>
            <el-tag v-else size="small">全天</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" link size="small" @click="removeSchedule(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <span>医生列表</span>
      </template>
      <el-table :data="doctorList" v-loading="loading" stripe size="small">
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="title" label="职称" width="100" />
        <el-table-column prop="department" label="科室" width="120" />
        <el-table-column prop="gender" label="性别" width="60">
          <template #default="{ row }">
            {{ row.gender === 'male' ? '男' : '女' }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDoctorDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="removeDoctor(row)">停用</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="doctorDialogVisible" :title="isEditDoctor ? '编辑医生' : '新增医生'" width="480px">
      <el-form :model="doctorForm" label-width="80px">
        <el-form-item label="姓名">
          <el-input v-model="doctorForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="职称">
          <el-select v-model="doctorForm.title" placeholder="请选择职称" style="width: 100%">
            <el-option label="主任医师" value="主任医师" />
            <el-option label="副主任医师" value="副主任医师" />
            <el-option label="主治医师" value="主治医师" />
            <el-option label="住院医师" value="住院医师" />
            <el-option label="主任技师" value="主任技师" />
            <el-option label="主管技师" value="主管技师" />
          </el-select>
        </el-form-item>
        <el-form-item label="科室">
          <el-select v-model="doctorForm.department" placeholder="请选择科室" style="width: 100%">
            <el-option label="内科" value="内科" />
            <el-option label="外科" value="外科" />
            <el-option label="超声科" value="超声科" />
            <el-option label="放射科" value="放射科" />
            <el-option label="功能科" value="功能科" />
            <el-option label="检验科" value="检验科" />
            <el-option label="眼科" value="眼科" />
            <el-option label="耳鼻喉科" value="耳鼻喉科" />
            <el-option label="口腔科" value="口腔科" />
            <el-option label="妇科" value="妇科" />
          </el-select>
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="doctorForm.gender">
            <el-radio value="male">男</el-radio>
            <el-radio value="female">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="doctorForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="doctorDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitDoctor">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="scheduleDialogVisible" title="添加排班" width="480px">
      <el-form :model="scheduleForm" label-width="100px">
        <el-form-item label="医生">
          <el-select v-model="scheduleForm.doctor_id" placeholder="请选择医生" style="width: 100%" filterable>
            <el-option 
              v-for="doc in doctorList" 
              :key="doc.id" 
              :label="`${doc.name} - ${doc.department}`" 
              :value="doc.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="负责项目">
          <el-select v-model="scheduleForm.exam_item_id" placeholder="选择负责项目(可选)" clearable style="width: 100%">
            <el-option 
              v-for="item in examItems" 
              :key="item.id" 
              :label="item.name" 
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="排班日期">
          <el-date-picker 
            v-model="scheduleForm.schedule_date" 
            type="date" 
            value-format="YYYY-MM-DD"
            style="width: 100%" 
          />
        </el-form-item>
        <el-form-item label="时间">
          <el-time-picker 
            v-model="scheduleForm.start_time" 
            format="HH:mm"
            value-format="HH:mm"
            placeholder="开始时间"
            style="width: 45%"
          />
          <span style="margin: 0 10px">-</span>
          <el-time-picker 
            v-model="scheduleForm.end_time" 
            format="HH:mm"
            value-format="HH:mm"
            placeholder="结束时间"
            style="width: 45%"
          />
        </el-form-item>
        <el-form-item label="班次">
          <el-radio-group v-model="scheduleForm.shift_type">
            <el-radio value="morning">早班</el-radio>
            <el-radio value="afternoon">午班</el-radio>
            <el-radio value="full">全天</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scheduleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSchedule">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const loading = ref(false)
const doctorDialogVisible = ref(false)
const scheduleDialogVisible = ref(false)
const isEditDoctor = ref(false)
const currentDate = ref(dayjs().format('YYYY-MM-DD'))
const doctorList = ref([])
const scheduleList = ref([])
const examItems = ref([])

const doctorForm = reactive({
  id: null,
  name: '',
  title: '',
  department: '',
  gender: 'male',
  phone: ''
})

const scheduleForm = reactive({
  doctor_id: null,
  exam_item_id: null,
  schedule_date: dayjs().format('YYYY-MM-DD'),
  start_time: '08:00',
  end_time: '12:00',
  shift_type: 'morning'
})

const loadData = async () => {
  loading.value = true
  try {
    if (window.api) {
      doctorList.value = await window.api.doctor.list()
      examItems.value = await window.api.examItem.list()
    } else {
      doctorList.value = mockDoctors
      examItems.value = mockItems
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadSchedule = async () => {
  loading.value = true
  try {
    if (window.api) {
      scheduleList.value = await window.api.schedule.list(currentDate.value)
    } else {
      scheduleList.value = mockSchedules
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const openDoctorDialog = (row = null) => {
  isEditDoctor.value = !!row
  if (row) {
    Object.assign(doctorForm, row)
  } else {
    Object.assign(doctorForm, {
      id: null,
      name: '',
      title: '',
      department: '',
      gender: 'male',
      phone: ''
    })
  }
  doctorDialogVisible.value = true
}

const submitDoctor = async () => {
  try {
    if (isEditDoctor.value) {
      if (window.api) {
        await window.api.doctor.update(doctorForm.id, doctorForm)
      }
      ElMessage.success('更新成功')
    } else {
      if (window.api) {
        await window.api.doctor.create(doctorForm)
      }
      ElMessage.success('新增成功')
    }
    doctorDialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const removeDoctor = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要停用医生"${row.name}"吗？`, '提示', { type: 'warning' })
    if (window.api) {
      await window.api.doctor.remove(row.id)
    }
    ElMessage.success('已停用')
    loadData()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

const openScheduleDialog = () => {
  scheduleForm.schedule_date = currentDate.value
  scheduleDialogVisible.value = true
}

const submitSchedule = async () => {
  try {
    if (window.api) {
      await window.api.schedule.create(scheduleForm)
    }
    ElMessage.success('排班添加成功')
    scheduleDialogVisible.value = false
    loadSchedule()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const removeSchedule = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该排班吗？', '提示', { type: 'warning' })
    if (window.api) {
      await window.api.schedule.remove(row.id)
    }
    ElMessage.success('已删除')
    loadSchedule()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

const mockDoctors = [
  { id: 1, name: '张医生', title: '主任医师', department: '内科', gender: 'male', phone: '13800000001' },
  { id: 2, name: '李医生', title: '副主任医师', department: '外科', gender: 'female', phone: '13800000002' },
  { id: 3, name: '王医生', title: '主治医师', department: '超声科', gender: 'female', phone: '13800000003' },
  { id: 4, name: '赵医生', title: '主治医师', department: '放射科', gender: 'male', phone: '13800000004' },
  { id: 5, name: '陈医生', title: '主治医师', department: '功能科', gender: 'female', phone: '13800000005' },
  { id: 6, name: '刘医生', title: '主任技师', department: '检验科', gender: 'male', phone: '13800000006' }
]

const mockItems = [
  { id: 1, name: '身高体重' },
  { id: 3, name: '血常规' },
  { id: 9, name: '心电图' },
  { id: 10, name: '胸部CT' },
  { id: 11, name: '腹部彩超' }
]

const mockSchedules = [
  { id: 1, schedule_date: '2024-01-15', doctor_name: '张医生', title: '主任医师', department: '内科', exam_item_name: '内科检查', start_time: '08:00', end_time: '12:00', shift_type: 'morning' },
  { id: 2, schedule_date: '2024-01-15', doctor_name: '王医生', title: '主治医师', department: '超声科', exam_item_name: '腹部彩超', start_time: '07:30', end_time: '12:00', shift_type: 'morning' },
  { id: 3, schedule_date: '2024-01-15', doctor_name: '赵医生', title: '主治医师', department: '放射科', exam_item_name: '胸部CT', start_time: '08:00', end_time: '17:00', shift_type: 'full' },
  { id: 4, schedule_date: '2024-01-15', doctor_name: '刘医生', title: '主任技师', department: '检验科', exam_item_name: null, start_time: '07:30', end_time: '12:00', shift_type: 'morning' }
]

onMounted(() => {
  loadData()
  loadSchedule()
})
</script>

<style scoped>
.doctor-manage {
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
</style>
