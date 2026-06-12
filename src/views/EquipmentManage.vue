<template>
  <div class="equipment-manage">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设备管理</span>
          <el-button type="primary" @click="openDialog">
            <el-icon><Plus /></el-icon>新增设备
          </el-button>
        </div>
      </template>

      <div class="equipment-grid">
        <el-row :gutter="20">
          <el-col :span="8" v-for="item in equipmentList" :key="item.id">
            <el-card class="eq-card" :class="item.status">
              <div class="eq-header">
                <div class="eq-icon">
                  <el-icon :size="36" v-if="item.type === 'CT'"><Film /></el-icon>
                  <el-icon :size="36" v-else-if="item.type === 'US'"><Connection /></el-icon>
                  <el-icon :size="36" v-else-if="item.type === 'ECG'"><Monitor /></el-icon>
                  <el-icon :size="36" v-else><Cpu /></el-icon>
                </div>
                <div class="eq-status">
                  <el-tag :type="getStatusType(item.status)" size="small">
                    {{ getStatusText(item.status) }}
                  </el-tag>
                </div>
              </div>
              <div class="eq-info">
                <h4>{{ item.name }}</h4>
                <p class="eq-code">{{ item.code }} | {{ item.model }}</p>
              </div>
              <el-descriptions :column="2" size="small" class="eq-desc">
                <el-descriptions-item label="类型">{{ getTypeText(item.type) }}</el-descriptions-item>
                <el-descriptions-item label="诊室">{{ item.room }}</el-descriptions-item>
                <el-descriptions-item label="运行时长">{{ item.running_hours }}h</el-descriptions-item>
                <el-descriptions-item label="上次维保">
                  {{ item.last_maintenance_date || '暂无' }}
                </el-descriptions-item>
              </el-descriptions>
              <div class="eq-actions">
                <el-button size="small" @click="openDialog(item)">编辑</el-button>
                <el-button size="small" type="danger" @click="removeEquipment(item)">删除</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>耗材库存</span>
        </div>
      </template>
      <el-table :data="supplyList" stripe>
        <el-table-column prop="name" label="耗材名称" width="180" />
        <el-table-column prop="code" label="编码" width="120" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="stock" label="当前库存" width="120">
          <template #default="{ row }">
            <span :class="{ 'low-stock': row.stock < row.safety_stock }">
              {{ row.stock }} {{ row.unit }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="safety_stock" label="安全库存" width="120" />
        <el-table-column prop="unit_price" label="单价(元)" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.stock < row.safety_stock" type="danger" size="small">库存不足</el-tag>
            <el-tag v-else type="success" size="small">正常</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑设备' : '新增设备'" width="480px">
      <el-form :model="formData" label-width="100px">
        <el-form-item label="设备名称">
          <el-input v-model="formData.name" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="设备编码">
          <el-input v-model="formData.code" placeholder="请输入设备编码" />
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="formData.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="CT" value="CT" />
            <el-option label="超声(US)" value="US" />
            <el-option label="心电图(ECG)" value="ECG" />
            <el-option label="X光(XRAY)" value="XRAY" />
            <el-option label="核磁(MRI)" value="MRI" />
            <el-option label="其他" value="OTHER" />
          </el-select>
        </el-form-item>
        <el-form-item label="型号">
          <el-input v-model="formData.model" placeholder="请输入设备型号" />
        </el-form-item>
        <el-form-item label="所在诊室">
          <el-input v-model="formData.room" placeholder="请输入诊室" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio value="normal">正常</el-radio>
            <el-radio value="maintenance">维护中</el-radio>
            <el-radio value="fault">故障</el-radio>
          </el-radio-group>
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const equipmentList = ref([])
const supplyList = ref([])

const formData = reactive({
  id: null,
  name: '',
  code: '',
  type: '',
  model: '',
  room: '',
  status: 'normal'
})

const loadData = async () => {
  loading.value = true
  try {
    if (window.api) {
      equipmentList.value = await window.api.equipment.list()
    } else {
      equipmentList.value = mockEquipment
      supplyList.value = mockSupplies
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
  } else {
    Object.assign(formData, {
      id: null,
      name: '',
      code: '',
      type: '',
      model: '',
      room: '',
      status: 'normal'
    })
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  try {
    if (isEdit.value) {
      if (window.api) {
        await window.api.equipment.update(formData.id, formData)
      }
      ElMessage.success('更新成功')
    } else {
      if (window.api) {
        await window.api.equipment.create(formData)
      }
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const removeEquipment = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除设备"${row.name}"吗？`, '提示', { type: 'warning' })
    if (window.api) {
      await window.api.equipment.remove(row.id)
    }
    ElMessage.success('已删除')
    loadData()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

const getStatusType = (status) => {
  const map = { normal: 'success', maintenance: 'warning', fault: 'danger' }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = { normal: '正常', maintenance: '维护中', fault: '故障' }
  return map[status] || status
}

const getTypeText = (type) => {
  const map = { CT: 'CT', US: '超声', ECG: '心电图', XRAY: 'X光', MRI: '核磁', OTHER: '其他' }
  return map[type] || type
}

const mockEquipment = [
  { id: 1, name: 'CT机', code: 'CT_01', type: 'CT', model: 'GE Revolution', room: 'CT-1室', status: 'normal', running_hours: 2350, last_maintenance_date: '2024-01-10' },
  { id: 2, name: '彩超机1', code: 'US_01', type: 'US', model: 'Philips EPIQ 7', room: '超声-1室', status: 'normal', running_hours: 3560, last_maintenance_date: '2024-01-05' },
  { id: 3, name: '彩超机2', code: 'US_02', type: 'US', model: 'Philips EPIQ 5', room: '超声-2室', status: 'maintenance', running_hours: 2890, last_maintenance_date: '2024-01-12' },
  { id: 4, name: '心电图机1', code: 'ECG_01', type: 'ECG', model: 'GE MAC 5500', room: '心电-1室', status: 'normal', running_hours: 1200, last_maintenance_date: '2024-01-08' },
  { id: 5, name: '心电图机2', code: 'ECG_02', type: 'ECG', model: 'GE MAC 2000', room: '心电-2室', status: 'normal', running_hours: 980, last_maintenance_date: '2024-01-08' }
]

const mockSupplies = [
  { id: 1, name: '真空采血管-紫色', code: 'TUBE_PURPLE', unit: '支', stock: 5000, safety_stock: 500, unit_price: 1.5 },
  { id: 2, name: '真空采血管-黄色', code: 'TUBE_YELLOW', unit: '支', stock: 4800, safety_stock: 500, unit_price: 1.5 },
  { id: 3, name: '超声耦合剂', code: 'COUPLING', unit: '瓶', stock: 38, safety_stock: 50, unit_price: 35.0 },
  { id: 4, name: '一次性尿杯', code: 'URINE_CUP', unit: '个', stock: 8000, safety_stock: 1000, unit_price: 0.3 },
  { id: 5, name: '一次性手套', code: 'GLOVES', unit: '副', stock: 300, safety_stock: 200, unit_price: 0.8 }
]

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.equipment-manage {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.eq-card {
  margin-bottom: 20px;
}

.eq-card.normal .eq-icon { color: #67c23a; }
.eq-card.maintenance .eq-icon { color: #e6a23c; }
.eq-card.fault .eq-icon { color: #f56c6c; }

.eq-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.eq-info h4 {
  font-size: 16px;
  color: #303133;
  margin-bottom: 4px;
}

.eq-code {
  font-size: 13px;
  color: #909399;
}

.eq-desc {
  margin: 12px 0;
}

.eq-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.low-stock {
  color: #f56c6c;
  font-weight: bold;
}
</style>
