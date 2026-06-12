<template>
  <div class="package-manage">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>体检套餐管理</span>
          <el-button type="primary" @click="openDialog">
            <el-icon><Plus /></el-icon>新增套餐
          </el-button>
        </div>
      </template>
      
      <el-table :data="packageList" v-loading="loading" stripe>
        <el-table-column prop="code" label="套餐编码" width="120" />
        <el-table-column prop="name" label="套餐名称" width="180" />
        <el-table-column prop="price" label="价格(元)" width="100">
          <template #default="{ row }">
            ¥{{ row.price.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="包含项目">
          <template #default="{ row }">
            <el-tag 
              v-for="item in row.items?.slice(0, 5)" 
              :key="item.id" 
              size="small" 
              style="margin: 2px"
              :type="item.require_fasting ? 'warning' : 'info'"
            >
              {{ item.name }}
            </el-tag>
            <span v-if="row.items?.length > 5" class="more-tags">
              +{{ row.items.length - 5 }}项
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="is_active" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
              {{ row.is_active ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">查看</el-button>
            <el-button type="primary" link size="small" @click="openDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="removePackage(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑套餐' : '新增套餐'" width="700px">
      <el-form :model="formData" label-width="100px" ref="formRef">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="套餐编码" prop="code" :rules="[{ required: true, message: '请输入套餐编码' }]">
              <el-input v-model="formData.code" placeholder="请输入套餐编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="套餐名称" prop="name" :rules="[{ required: true, message: '请输入套餐名称' }]">
              <el-input v-model="formData.name" placeholder="请输入套餐名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="价格" prop="price">
              <el-input-number v-model="formData.price" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="套餐描述">
              <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="请输入套餐描述" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="包含项目">
              <el-select 
                v-model="selectedItems" 
                multiple 
                placeholder="请选择检查项目" 
                style="width: 100%"
                filterable
              >
                <el-option
                  v-for="item in examItems"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                >
                  <span>{{ item.name }}</span>
                  <span style="float: right; color: #8492a6; font-size: 12px">
                    {{ item.department }} | {{ item.standard_duration }}分钟
                    <el-tag v-if="item.require_fasting" size="small" type="warning" style="margin-left: 5px">空腹</el-tag>
                  </span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="套餐详情" width="600px">
      <div v-if="currentPackage" class="package-detail">
        <div class="detail-header">
          <h3>{{ currentPackage.name }}</h3>
          <span class="price">¥{{ currentPackage.price?.toFixed(2) }}</span>
        </div>
        <p class="desc">{{ currentPackage.description || '暂无描述' }}</p>
        <div class="item-list">
          <div class="item-header">
            <span>项目列表</span>
            <span>共 {{ currentPackage.items?.length || 0 }} 项</span>
          </div>
          <div 
            v-for="item in currentPackage.items" 
            :key="item.id" 
            class="item-row"
          >
            <div class="item-info">
              <span class="item-name">{{ item.name }}</span>
              <el-tag v-if="item.require_fasting" size="small" type="warning">空腹</el-tag>
              <el-tag v-if="item.gender_restriction !== 'all'" size="small">
                {{ item.gender_restriction === 'male' ? '男' : '女' }}
              </el-tag>
            </div>
            <div class="item-meta">
              <span>{{ item.department }}</span>
              <span>{{ item.standard_duration }}分钟</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const dialogVisible = ref(false)
const detailVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const packageList = ref([])
const examItems = ref([])
const selectedItems = ref([])
const currentPackage = ref(null)

const formData = reactive({
  id: null,
  code: '',
  name: '',
  price: 0,
  description: ''
})

const loadData = async () => {
  loading.value = true
  try {
    if (window.api) {
      packageList.value = await window.api.package.list()
      examItems.value = await window.api.examItem.list()
    } else {
      packageList.value = mockPackages
      examItems.value = mockItems
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
    formData.id = row.id
    formData.code = row.code
    formData.name = row.name
    formData.price = row.price
    formData.description = row.description
    selectedItems.value = row.items?.map(i => i.exam_item_id) || []
  } else {
    formData.id = null
    formData.code = ''
    formData.name = ''
    formData.price = 0
    formData.description = ''
    selectedItems.value = []
  }
  dialogVisible.value = true
}

const viewDetail = (row) => {
  currentPackage.value = row
  detailVisible.value = true
}

const submitForm = async () => {
  try {
    const data = {
      ...formData,
      items: selectedItems.value
    }
    
    if (isEdit.value) {
      if (window.api) {
        await window.api.package.update(formData.id, data)
      }
      ElMessage.success('更新成功')
    } else {
      if (window.api) {
        await window.api.package.create(data)
      }
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  }
}

const removePackage = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除套餐"${row.name}"吗？`, '提示', {
      type: 'warning'
    })
    if (window.api) {
      await window.api.package.remove(row.id)
    }
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
    }
  }
}

const mockItems = [
  { id: 1, name: '身高体重', department: '一般检查', standard_duration: 5, require_fasting: false, gender_restriction: 'all' },
  { id: 2, name: '血压', department: '一般检查', standard_duration: 5, require_fasting: false, gender_restriction: 'all' },
  { id: 3, name: '血常规', department: '检验科', standard_duration: 10, require_fasting: true, gender_restriction: 'all' },
  { id: 4, name: '肝功能', department: '检验科', standard_duration: 15, require_fasting: true, gender_restriction: 'all' },
  { id: 9, name: '心电图', department: '功能科', standard_duration: 10, require_fasting: false, gender_restriction: 'all' },
  { id: 10, name: '胸部CT', department: '放射科', standard_duration: 15, require_fasting: false, gender_restriction: 'all' },
  { id: 11, name: '腹部彩超', department: '超声科', standard_duration: 20, require_fasting: true, gender_restriction: 'all' }
]

const mockPackages = [
  { id: 1, code: 'PKG_A', name: '基础体检套餐A', price: 580, is_active: 1, description: '基础体检项目', items: mockItems.slice(0, 5) },
  { id: 2, code: 'PKG_B', name: '标准体检套餐B', price: 1280, is_active: 1, description: '标准体检项目', items: mockItems },
  { id: 3, code: 'PKG_C', name: '精英体检套餐C', price: 2580, is_active: 1, description: '全面体检项目', items: mockItems }
]

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.package-manage {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.more-tags {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

.package-detail .detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.package-detail .detail-header h3 {
  font-size: 20px;
  color: #303133;
}

.package-detail .price {
  font-size: 24px;
  color: #f56c6c;
  font-weight: bold;
}

.package-detail .desc {
  color: #606266;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.item-list .item-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 500;
  color: #303133;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-name {
  font-weight: 500;
}

.item-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
}
</style>
