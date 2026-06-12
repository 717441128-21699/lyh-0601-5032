<template>
  <div class="exam-item-manage">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>检查项目管理</span>
          <el-button type="primary" @click="openDialog">
            <el-icon><Plus /></el-icon>新增项目
          </el-button>
        </div>
      </template>
      
      <div class="filter-bar">
        <el-input v-model="keyword" placeholder="搜索项目名称/编码" style="width: 240px" clearable>
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="departmentFilter" placeholder="科室筛选" clearable style="width: 160px">
          <el-option 
            v-for="dept in departments" 
            :key="dept" 
            :label="dept" 
            :value="dept" 
          />
        </el-select>
      </div>
      
      <el-table :data="filteredList" v-loading="loading" stripe>
        <el-table-column prop="code" label="项目编码" width="120" />
        <el-table-column prop="name" label="项目名称" width="160" />
        <el-table-column prop="department" label="所属科室" width="120" />
        <el-table-column prop="standard_duration" label="标准耗时(分钟)" width="120" />
        <el-table-column prop="require_fasting" label="空腹要求" width="100">
          <template #default="{ row }">
            <el-tag :type="row.require_fasting ? 'warning' : 'info'" size="small">
              {{ row.require_fasting ? '需空腹' : '无需' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="gender_restriction" label="性别限制" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.gender_restriction === 'all'" size="small" type="info">不限</el-tag>
            <el-tag v-else-if="row.gender_restriction === 'male'" size="small" type="primary">男</el-tag>
            <el-tag v-else size="small" type="danger">女</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="equipment_dependency" label="设备依赖" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.equipment_dependency" size="small" type="success">
              {{ row.equipment_dependency }}
            </el-tag>
            <span v-else style="color: #c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="removeItem(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑项目' : '新增项目'" width="500px">
      <el-form :model="formData" label-width="100px" ref="formRef">
        <el-form-item label="项目编码" prop="code">
          <el-input v-model="formData.code" placeholder="请输入项目编码" />
        </el-form-item>
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="所属科室" prop="department">
          <el-select v-model="formData.department" placeholder="请选择科室" style="width: 100%">
            <el-option label="一般检查" value="一般检查" />
            <el-option label="检验科" value="检验科" />
            <el-option label="功能科" value="功能科" />
            <el-option label="放射科" value="放射科" />
            <el-option label="超声科" value="超声科" />
            <el-option label="内科" value="内科" />
            <el-option label="外科" value="外科" />
            <el-option label="眼科" value="眼科" />
            <el-option label="耳鼻喉科" value="耳鼻喉科" />
            <el-option label="口腔科" value="口腔科" />
            <el-option label="妇科" value="妇科" />
          </el-select>
        </el-form-item>
        <el-form-item label="标准耗时" prop="standard_duration">
          <el-input-number v-model="formData.standard_duration" :min="1" :max="180" />
          <span style="margin-left: 8px; color: #909399">分钟</span>
        </el-form-item>
        <el-form-item label="空腹要求">
          <el-switch v-model="formData.require_fasting" />
          <span style="margin-left: 8px; color: #909399">需要空腹</span>
        </el-form-item>
        <el-form-item label="性别限制">
          <el-radio-group v-model="formData.gender_restriction">
            <el-radio value="all">不限</el-radio>
            <el-radio value="male">男</el-radio>
            <el-radio value="female">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="设备依赖">
          <el-select v-model="formData.equipment_dependency" placeholder="选择设备类型" clearable style="width: 100%">
            <el-option label="CT" value="CT" />
            <el-option label="超声(US)" value="US" />
            <el-option label="心电图(ECG)" value="ECG" />
            <el-option label="X光(XRAY)" value="XRAY" />
            <el-option label="核磁(MRI)" value="MRI" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="请输入项目描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const itemList = ref([])
const keyword = ref('')
const departmentFilter = ref('')

const formData = reactive({
  id: null,
  name: '',
  code: '',
  department: '',
  standard_duration: 15,
  require_fasting: false,
  gender_restriction: 'all',
  equipment_dependency: '',
  description: ''
})

const departments = computed(() => {
  const depts = new Set(itemList.value.map(i => i.department))
  return Array.from(depts)
})

const filteredList = computed(() => {
  let list = itemList.value
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(i => 
      i.name.toLowerCase().includes(kw) || 
      i.code.toLowerCase().includes(kw)
    )
  }
  if (departmentFilter.value) {
    list = list.filter(i => i.department === departmentFilter.value)
  }
  return list
})

const loadData = async () => {
  loading.value = true
  try {
    if (window.api) {
      itemList.value = await window.api.examItem.list()
    } else {
      itemList.value = mockData
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const openDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    Object.assign(formData, row)
    formData.require_fasting = !!row.require_fasting
  } else {
    Object.assign(formData, {
      id: null,
      name: '',
      code: '',
      department: '',
      standard_duration: 15,
      require_fasting: false,
      gender_restriction: 'all',
      equipment_dependency: '',
      description: ''
    })
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  try {
    if (isEdit.value) {
      if (window.api) {
        await window.api.examItem.update(formData.id, formData)
      }
      ElMessage.success('更新成功')
    } else {
      if (window.api) {
        await window.api.examItem.create(formData)
      }
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  }
}

const removeItem = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除项目"${row.name}"吗？`, '提示', { type: 'warning' })
    if (window.api) {
      await window.api.examItem.remove(row.id)
    }
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

const mockData = [
  { id: 1, name: '身高体重', code: 'HW', department: '一般检查', standard_duration: 5, require_fasting: 0, gender_restriction: 'all', equipment_dependency: null, description: '测量身高、体重、BMI' },
  { id: 2, name: '血压', code: 'BP', department: '一般检查', standard_duration: 5, require_fasting: 0, gender_restriction: 'all', equipment_dependency: null, description: '测量血压、心率' },
  { id: 3, name: '血常规', code: 'CBC', department: '检验科', standard_duration: 10, require_fasting: 1, gender_restriction: 'all', equipment_dependency: null, description: '血常规检查' },
  { id: 4, name: '肝功能', code: 'LIVER', department: '检验科', standard_duration: 15, require_fasting: 1, gender_restriction: 'all', equipment_dependency: null, description: '肝功能检查' },
  { id: 9, name: '心电图', code: 'ECG', department: '功能科', standard_duration: 10, require_fasting: 0, gender_restriction: 'all', equipment_dependency: 'ECG', description: '心电图检查' },
  { id: 10, name: '胸部CT', code: 'CHEST_CT', department: '放射科', standard_duration: 15, require_fasting: 0, gender_restriction: 'all', equipment_dependency: 'CT', description: '胸部CT平扫' },
  { id: 11, name: '腹部彩超', code: 'ABD_US', department: '超声科', standard_duration: 20, require_fasting: 1, gender_restriction: 'all', equipment_dependency: 'US', description: '腹部彩色超声' }
]

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.exam-item-manage {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
</style>
