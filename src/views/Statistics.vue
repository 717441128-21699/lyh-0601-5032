<template>
  <div class="statistics">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>统计报表</span>
          <div class="header-actions">
            <el-date-picker
              v-model="dateRange"
              type="month"
              range-separator="至"
              start-placeholder="开始月份"
              end-placeholder="结束月份"
              value-format="YYYY-MM"
              style="width: 300px"
            />
            <el-button type="primary">
              <el-icon><Download /></el-icon>导出PDF报告
            </el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card total">
            <div class="stat-icon">
              <el-icon :size="32"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalPerson }}</div>
              <div class="stat-label">体检总人次</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card positive">
            <div class="stat-icon">
              <el-icon :size="32"><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.positiveRate }}%</div>
              <div class="stat-label">阳性检出率</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card avg">
            <div class="stat-icon">
              <el-icon :size="32"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.avgTime }}分钟</div>
              <div class="stat-label">平均耗时</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card satisfaction">
            <div class="stat-icon">
              <el-icon :size="32"><Star /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.satisfaction }}分</div>
              <div class="stat-label">客户满意度</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>各套餐体检人次</span>
          </template>
          <div class="chart-placeholder">
            <el-table :data="packageStats" size="small">
              <el-table-column prop="name" label="套餐名称" />
              <el-table-column prop="count" label="人次" width="100" align="right" />
              <el-table-column prop="income" label="收入(元)" width="120" align="right" />
              <el-table-column label="占比" width="180">
                <template #default="{ row }">
                  <el-progress :percentage="row.ratio" :stroke-width="10" show-text="false" />
                  <span style="margin-left: 8px; font-size: 12px">{{ row.ratio }}%</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>各科室工作量统计</span>
          </template>
          <div class="chart-placeholder">
            <el-table :data="deptStats" size="small">
              <el-table-column prop="name" label="科室" />
              <el-table-column prop="count" label="检查项次" width="100" align="right" />
              <el-table-column prop="avgTime" label="平均耗时(分)" width="120" align="right" />
              <el-table-column prop="doctor" label="医生数" width="80" align="right" />
            </el-table>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>医生工作量排名</span>
          </template>
          <el-table :data="doctorStats" size="small">
            <el-table-column type="index" label="排名" width="60" />
            <el-table-column prop="name" label="医生姓名" />
            <el-table-column prop="department" label="科室" width="100" />
            <el-table-column prop="count" label="检查人次" width="100" align="right" />
            <el-table-column prop="positiveRate" label="阳性率" width="100" align="right">
              <template #default="{ row }">{{ row.positiveRate }}%</template>
            </el-table-column>
            <el-table-column prop="avgTime" label="平均耗时" width="100" align="right">
              <template #default="{ row }">{{ row.avgTime }}分</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>科室忙闲热力图</span>
          </template>
          <div class="heatmap-container">
            <div class="floor-plan">
              <div class="floor-title">一楼平面图</div>
              <div class="rooms">
                <div 
                  v-for="room in floorRooms" 
                  :key="room.name" 
                  class="room"
                  :class="getHeatClass(room.heat)"
                  :style="{ gridArea: room.area }"
                >
                  <div class="room-name">{{ room.name }}</div>
                  <div class="room-info">
                    <span>{{ room.count }}人</span>
                    <span>等待{{ room.queue }}人</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="heat-legend">
              <span>忙闲程度：</span>
              <span class="legend-item idle">空闲</span>
              <span class="legend-item normal">正常</span>
              <span class="legend-item busy">繁忙</span>
              <span class="legend-item overload">过载</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const dateRange = ref(['2024-01', '2024-01'])

const stats = reactive({
  totalPerson: 2856,
  positiveRate: 68.5,
  avgTime: 95,
  satisfaction: 4.8
})

const packageStats = ref([
  { name: '基础体检套餐A', count: 1024, income: 593920, ratio: 36 },
  { name: '标准体检套餐B', count: 986, income: 1262080, ratio: 34 },
  { name: '精英体检套餐C', count: 568, income: 1465440, ratio: 20 },
  { name: '妇科专项套餐', count: 278, income: 222400, ratio: 10 }
])

const deptStats = ref([
  { name: '一般检查', count: 2856, avgTime: 8, doctor: 3 },
  { name: '检验科', count: 8568, avgTime: 12, doctor: 5 },
  { name: '超声科', count: 4284, avgTime: 18, doctor: 4 },
  { name: '放射科', count: 2570, avgTime: 15, doctor: 3 },
  { name: '功能科', count: 2856, avgTime: 10, doctor: 2 },
  { name: '内科', count: 2856, avgTime: 12, doctor: 3 },
  { name: '外科', count: 2856, avgTime: 10, doctor: 2 }
])

const doctorStats = ref([
  { name: '王医生', department: '超声科', count: 486, positiveRate: '72.5', avgTime: 18 },
  { name: '张医生', department: '内科', count: 425, positiveRate: '65.2', avgTime: 12 },
  { name: '赵医生', department: '放射科', count: 398, positiveRate: '58.3', avgTime: 15 },
  { name: '刘医生', department: '检验科', count: 856, positiveRate: '70.1', avgTime: 10 },
  { name: '李医生', department: '外科', count: 385, positiveRate: '45.6', avgTime: 10 }
])

const floorRooms = ref([
  { name: '一般检查室', area: 'r1', heat: 30, count: 5, queue: 1 },
  { name: '采血室', area: 'r2', heat: 85, count: 4, queue: 6 },
  { name: '超声-1室', area: 'r3', heat: 90, count: 1, queue: 8 },
  { name: '超声-2室', area: 'r4', heat: 70, count: 1, queue: 5 },
  { name: 'CT室', area: 'r5', heat: 55, count: 1, queue: 3 },
  { name: '心电室', area: 'r6', heat: 40, count: 2, queue: 2 },
  { name: '内科诊室', area: 'r7', heat: 25, count: 1, queue: 0 },
  { name: '外科诊室', area: 'r8', heat: 20, count: 1, queue: 0 }
])

const getHeatClass = (heat) => {
  if (heat >= 80) return 'overload'
  if (heat >= 60) return 'busy'
  if (heat >= 30) return 'normal'
  return 'idle'
}
</script>

<style scoped>
.statistics {
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

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 8px;
  color: white;
}

.stat-card.total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-card.positive { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); }
.stat-card.avg { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.stat-card.satisfaction { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 4px;
}

.chart-row {
  margin-top: 0;
}

.chart-placeholder {
  min-height: 200px;
}

.heatmap-container {
  padding: 10px 0;
}

.floor-plan {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.floor-title {
  text-align: center;
  font-weight: 500;
  margin-bottom: 16px;
  color: #606266;
}

.rooms {
  display: grid;
  grid-template-areas:
    "r1 r2 r3 r4"
    "r5 r6 r7 r8";
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.room {
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  transition: all 0.3s;
}

.room.idle { background: #f0f9eb; border: 2px solid #67c23a; }
.room.normal { background: #ecf5ff; border: 2px solid #409eff; }
.room.busy { background: #fdf6ec; border: 2px solid #e6a23c; }
.room.overload { background: #fef0f0; border: 2px solid #f56c6c; }

.room-name {
  font-weight: 500;
  margin-bottom: 8px;
  color: #303133;
}

.room-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #606266;
}

.heat-legend {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  font-size: 12px;
  color: #606266;
}

.legend-item {
  padding: 4px 12px;
  border-radius: 4px;
}

.legend-item.idle { background: #f0f9eb; color: #67c23a; }
.legend-item.normal { background: #ecf5ff; color: #409eff; }
.legend-item.busy { background: #fdf6ec; color: #e6a23c; }
.legend-item.overload { background: #fef0f0; color: #f56c6c; }
</style>
