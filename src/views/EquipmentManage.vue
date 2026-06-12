<template>
  <div class="equipment-manage">
    <el-card v-loading="eqLoading">
      <template #header>
        <div class="card-header">
          <span>设备管理</span>
          <el-button type="primary" @click="openEqDialog">
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
                <el-button size="small" @click="openEqDialog(item)">编辑</el-button>
                <el-button size="small" type="danger" @click="removeEquipment(item)">删除</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <el-card style="margin-top: 20px" v-loading="supplyLoading">
      <template #header>
        <div class="card-header">
          <span>耗材库存</span>
          <div class="header-actions">
            <el-button @click="loadSupplyData">
              <el-icon><Refresh /></el-icon>刷新
            </el-button>
            <el-button type="primary" @click="openSupplyDialog">
              <el-icon><Plus /></el-icon>新增耗材
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="supplyList" stripe border>
        <el-table-column prop="name" label="耗材名称" min-width="160" />
        <el-table-column prop="code" label="编码" width="140" />
        <el-table-column prop="stock" label="当前库存" width="110" align="center">
          <template #default="{ row }">
            <span :class="getStockStatusClass(row)">
              {{ row.stock }} {{ row.unit }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="70" align="center" />
        <el-table-column prop="safety_stock" label="安全库存" width="100" align="center" />
        <el-table-column label="库存状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStockTagType(row)" size="small" effect="dark">
              {{ getStockStatusText(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="unit_price" label="单价(元)" width="100" align="center">
          <template #default="{ row }">
            ¥{{ row.unit_price?.toFixed?.(2) || row.unit_price }}
          </template>
        </el-table-column>
        <el-table-column prop="related_dept" label="所属科室" width="120" />
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openAdjustDialog(row)">调整库存</el-button>
            <el-button size="small" @click="openRecordDialog(row)">查看记录</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="eqDialogVisible" :title="isEqEdit ? '编辑设备' : '新增设备'" width="480px">
      <el-form :model="eqForm" label-width="100px">
        <el-form-item label="设备名称">
          <el-input v-model="eqForm.name" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="设备编码">
          <el-input v-model="eqForm.code" placeholder="请输入设备编码" />
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="eqForm.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="CT" value="CT" />
            <el-option label="超声(US)" value="US" />
            <el-option label="心电图(ECG)" value="ECG" />
            <el-option label="X光(XRAY)" value="XRAY" />
            <el-option label="核磁(MRI)" value="MRI" />
            <el-option label="其他" value="OTHER" />
          </el-select>
        </el-form-item>
        <el-form-item label="型号">
          <el-input v-model="eqForm.model" placeholder="请输入设备型号" />
        </el-form-item>
        <el-form-item label="所在诊室">
          <el-input v-model="eqForm.room" placeholder="请输入诊室" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="eqForm.status">
            <el-radio value="normal">正常</el-radio>
            <el-radio value="maintenance">维护中</el-radio>
            <el-radio value="fault">故障</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="eqDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEqForm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="supplyDialogVisible" :title="isSupplyEdit ? '编辑耗材' : '新增耗材'" width="480px">
      <el-form :model="supplyForm" label-width="100px">
        <el-form-item label="耗材名称">
          <el-input v-model="supplyForm.name" placeholder="请输入耗材名称" />
        </el-form-item>
        <el-form-item label="耗材编码">
          <el-input v-model="supplyForm.code" placeholder="请输入耗材编码" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="supplyForm.unit" placeholder="如：支、瓶、个" />
        </el-form-item>
        <el-form-item label="当前库存">
          <el-input-number v-model="supplyForm.stock" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="安全库存">
          <el-input-number v-model="supplyForm.safety_stock" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单价(元)">
          <el-input-number v-model="supplyForm.unit_price" :min="0" :precision="2" :step="0.1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="所属科室">
          <el-input v-model="supplyForm.related_dept" placeholder="请输入所属科室" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="supplyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSupplyForm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="adjustDialogVisible" title="库存调整" width="420px">
      <div class="adjust-info" v-if="currentSupply">
        <p><span class="label">耗材名称：</span>{{ currentSupply.name }}</p>
        <p><span class="label">当前库存：</span>{{ currentSupply.stock }} {{ currentSupply.unit }}</p>
        <p><span class="label">安全库存：</span>{{ currentSupply.safety_stock }} {{ currentSupply.unit }}</p>
      </div>
      <el-form :model="adjustForm" label-width="100px" style="margin-top: 16px">
        <el-form-item label="调整数量">
          <el-input-number v-model="adjustForm.quantity" :step="1" style="width: 100%" />
          <div class="form-tip">正数增加库存，负数减少库存</div>
        </el-form-item>
        <el-form-item label="调整后库存">
          <span class="adjust-result" :class="{ negative: adjustResult < 0 }">
            {{ adjustResult }} {{ currentSupply?.unit || '' }}
          </span>
          <el-tag v-if="adjustResult < 0" type="danger" size="small" style="margin-left: 8px">库存不足</el-tag>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="adjustForm.remark" type="textarea" :rows="3" placeholder="请输入调整原因备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="adjustResult < 0" @click="submitAdjust">确认调整</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="recordDialogVisible" title="使用记录" width="600px">
      <div class="record-header" v-if="currentSupply">
        <span class="record-title">{{ currentSupply.name }}</span>
        <span class="record-sub">当前库存：{{ currentSupply.stock }} {{ currentSupply.unit }}</span>
      </div>
      <el-table :data="recordList" stripe size="small" v-loading="recordLoading" max-height="400">
        <el-table-column prop="time" label="时间" width="170" />
        <el-table-column prop="type" label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'in' ? 'success' : 'warning'" size="small">
              {{ row.type === 'in' ? '入库' : '出库' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="90" align="center">
          <template #default="{ row }">
            <span :class="row.type === 'in' ? 'text-success' : 'text-warning'">
              {{ row.type === 'in' ? '+' : '-' }}{{ row.quantity }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column prop="remark" label="备注" min-width="120" />
      </el-table>
      <div v-if="!recordLoading && recordList.length === 0" class="empty-tip">
        暂无使用记录
      </div>
      <template #footer>
        <el-button @click="recordDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'

const eqLoading = ref(false)
const supplyLoading = ref(false)
const recordLoading = ref(false)

const eqDialogVisible = ref(false)
const supplyDialogVisible = ref(false)
const adjustDialogVisible = ref(false)
const recordDialogVisible = ref(false)

const isEqEdit = ref(false)
const isSupplyEdit = ref(false)

const equipmentList = ref([])
const supplyList = ref([])
const recordList = ref([])
const currentSupply = ref(null)

const eqForm = reactive({
  id: null,
  name: '',
  code: '',
  type: '',
  model: '',
  room: '',
  status: 'normal'
})

const supplyForm = reactive({
  id: null,
  name: '',
  code: '',
  unit: '',
  stock: 0,
  safety_stock: 0,
  unit_price: 0,
  related_dept: ''
})

const adjustForm = reactive({
  quantity: 0,
  remark: ''
})

const adjustResult = computed(() => {
  if (!currentSupply.value) return 0
  return currentSupply.value.stock + (adjustForm.quantity || 0)
})

const getStockTagType = (row) => {
  const stock = row.stock
  const safety = row.safety_stock
  if (stock <= safety * 0.5) return 'danger'
  if (stock <= safety) return 'warning'
  return 'success'
}

const getStockStatusText = (row) => {
  const stock = row.stock
  const safety = row.safety_stock
  if (stock <= safety * 0.5) return '紧急'
  if (stock <= safety) return '预警'
  return '正常'
}

const getStockStatusClass = (row) => {
  const stock = row.stock
  const safety = row.safety_stock
  if (stock <= safety * 0.5) return 'stock-danger'
  if (stock <= safety) return 'stock-warning'
  return 'stock-normal'
}

const loadEquipmentData = async () => {
  eqLoading.value = true
  try {
    if (window.api?.equipment?.list) {
      equipmentList.value = await window.api.equipment.list()
    } else {
      equipmentList.value = mockEquipment
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('加载设备数据失败')
  } finally {
    eqLoading.value = false
  }
}

const loadSupplyData = async () => {
  supplyLoading.value = true
  try {
    if (window.api?.supply?.list) {
      supplyList.value = await window.api.supply.list()
    } else {
      supplyList.value = mockSupplies
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('加载耗材数据失败')
  } finally {
    supplyLoading.value = false
  }
}

const openEqDialog = (row = null) => {
  isEqEdit.value = !!row
  if (row) {
    Object.assign(eqForm, row)
  } else {
    Object.assign(eqForm, {
      id: null,
      name: '',
      code: '',
      type: '',
      model: '',
      room: '',
      status: 'normal'
    })
  }
  eqDialogVisible.value = true
}

const submitEqForm = async () => {
  try {
    if (isEqEdit.value) {
      if (window.api?.equipment?.update) {
        await window.api.equipment.update(eqForm.id, eqForm)
      }
      ElMessage.success('更新成功')
    } else {
      if (window.api?.equipment?.create) {
        await window.api.equipment.create(eqForm)
      }
      ElMessage.success('新增成功')
    }
    eqDialogVisible.value = false
    loadEquipmentData()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const removeEquipment = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除设备"${row.name}"吗？`, '提示', { type: 'warning' })
    if (window.api?.equipment?.remove) {
      await window.api.equipment.remove(row.id)
    }
    ElMessage.success('已删除')
    loadEquipmentData()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

const openSupplyDialog = (row = null) => {
  isSupplyEdit.value = !!row
  if (row) {
    Object.assign(supplyForm, row)
  } else {
    Object.assign(supplyForm, {
      id: null,
      name: '',
      code: '',
      unit: '',
      stock: 0,
      safety_stock: 0,
      unit_price: 0,
      related_dept: ''
    })
  }
  supplyDialogVisible.value = true
}

const submitSupplyForm = async () => {
  try {
    if (isSupplyEdit.value) {
      if (window.api?.supply?.update) {
        await window.api.supply.update(supplyForm.id, supplyForm)
      }
      ElMessage.success('更新成功')
    } else {
      if (window.api?.supply?.create) {
        await window.api.supply.create(supplyForm)
      }
      ElMessage.success('新增成功')
    }
    supplyDialogVisible.value = false
    loadSupplyData()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const openAdjustDialog = (row) => {
  currentSupply.value = { ...row }
  adjustForm.quantity = 0
  adjustForm.remark = ''
  adjustDialogVisible.value = true
}

const submitAdjust = async () => {
  if (!currentSupply.value) return
  if (adjustResult.value < 0) {
    ElMessage.error('调整后库存不能为负数')
    return
  }
  try {
    if (window.api?.supply?.adjustStock) {
      await window.api.supply.adjustStock(currentSupply.value.id, {
        quantity: adjustForm.quantity,
        remark: adjustForm.remark
      })
    }
    ElMessage.success('库存调整成功')
    adjustDialogVisible.value = false
    loadSupplyData()
  } catch (e) {
    ElMessage.error('调整失败')
  }
}

const openRecordDialog = async (row) => {
  currentSupply.value = { ...row }
  recordList.value = []
  recordDialogVisible.value = true
  await loadRecords(row.id)
}

const loadRecords = async (supplyId) => {
  recordLoading.value = true
  try {
    if (window.api?.supply?.getRecords) {
      recordList.value = await window.api.supply.getRecords(supplyId)
    } else {
      recordList.value = mockRecords
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('加载记录失败')
  } finally {
    recordLoading.value = false
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
  { id: 1, name: '真空采血管-紫色', code: 'TUBE_PURPLE', unit: '支', stock: 485, safety_stock: 500, unit_price: 1.5, related_dept: '检验科' },
  { id: 2, name: '真空采血管-黄色', code: 'TUBE_YELLOW', unit: '支', stock: 520, safety_stock: 500, unit_price: 1.5, related_dept: '检验科' },
  { id: 3, name: '超声耦合剂', code: 'COUPLING', unit: '瓶', stock: 42, safety_stock: 50, unit_price: 35.0, related_dept: '超声科' },
  { id: 4, name: '一次性尿杯', code: 'URINE_CUP', unit: '个', stock: 860, safety_stock: 1000, unit_price: 0.3, related_dept: '检验科' },
  { id: 5, name: '一次性手套', code: 'GLOVES', unit: '副', stock: 180, safety_stock: 200, unit_price: 0.8, related_dept: '' },
  { id: 6, name: '一次性口罩', code: 'MASK', unit: '个', stock: 850, safety_stock: 500, unit_price: 0.5, related_dept: '' }
]

const mockRecords = [
  { id: 1, time: '2024-01-15 09:30:00', type: 'out', quantity: 50, operator: '张护士', remark: '检验科日常使用' },
  { id: 2, time: '2024-01-14 14:20:00', type: 'in', quantity: 200, operator: '李库管', remark: '采购入库' },
  { id: 3, time: '2024-01-13 10:15:00', type: 'out', quantity: 30, operator: '王护士', remark: '门诊使用' },
  { id: 4, time: '2024-01-12 16:45:00', type: 'out', quantity: 20, operator: '张护士', remark: '急诊使用' },
  { id: 5, time: '2024-01-10 11:00:00', type: 'in', quantity: 500, operator: '李库管', remark: '月度采购入库' }
]

onMounted(() => {
  loadEquipmentData()
  loadSupplyData()
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

.header-actions {
  display: flex;
  gap: 8px;
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

.stock-danger {
  color: #f56c6c;
  font-weight: bold;
}

.stock-warning {
  color: #e6a23c;
  font-weight: bold;
}

.stock-normal {
  color: #67c23a;
}

.adjust-info {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 4px;
}

.adjust-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #606266;
}

.adjust-info .label {
  color: #909399;
}

.adjust-result {
  font-size: 18px;
  font-weight: bold;
  color: #67c23a;
}

.adjust-result.negative {
  color: #f56c6c;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0 12px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 12px;
}

.record-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.record-sub {
  font-size: 13px;
  color: #909399;
}

.text-success {
  color: #67c23a;
  font-weight: 500;
}

.text-warning {
  color: #e6a23c;
  font-weight: 500;
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #909399;
  font-size: 14px;
}
</style>
