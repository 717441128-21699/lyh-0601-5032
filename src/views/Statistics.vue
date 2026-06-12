<template>
  <div class="statistics">
    <el-card v-loading="loading" class="no-print">
      <template #header>
        <div class="card-header">
          <span>统计报表</span>
          <div class="header-actions">
            <el-date-picker
              v-model="selectedMonth"
              type="month"
              placeholder="选择月份"
              value-format="YYYY-MM"
              style="width: 180px"
              @change="fetchData"
            />
            <el-button type="primary" :icon="Download" @click="exportPDF">
              导出PDF报告
            </el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6">
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
        <el-col :xs="24" :sm="12" :md="6">
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
        <el-col :xs="24" :sm="12" :md="6">
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
        <el-col :xs="24" :sm="12" :md="6">
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

    <el-row :gutter="20" class="chart-row no-print">
      <el-col :span="24" :md="12">
        <el-card>
          <template #header>
            <span>套餐统计</span>
          </template>
          <div class="table-container">
            <el-table :data="packageStats" size="default" border>
              <el-table-column prop="name" label="套餐名称" />
              <el-table-column prop="count" label="人次" width="100" align="right" />
              <el-table-column prop="income" label="收入(元)" width="120" align="right">
                <template #default="{ row }">
                  {{ formatMoney(row.income) }}
                </template>
              </el-table-column>
              <el-table-column label="占比" min-width="180">
                <template #default="{ row }">
                  <el-progress :percentage="row.ratio" :stroke-width="10" show-text="false" />
                  <span class="ratio-text">{{ row.ratio }}%</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-col>
      <el-col :span="24" :md="12">
        <el-card>
          <template #header>
            <span>科室工作量统计</span>
          </template>
          <div class="table-container">
            <el-table :data="deptStats" size="default" border>
              <el-table-column prop="name" label="科室" />
              <el-table-column prop="examCount" label="检查项次" width="100" align="right" />
              <el-table-column prop="personCount" label="受检人数" width="100" align="right" />
              <el-table-column prop="avgTime" label="平均耗时(分钟)" width="130" align="right" />
            </el-table>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row no-print">
      <el-col :span="24" :md="12">
        <el-card>
          <template #header>
            <span>医生工作量排名</span>
          </template>
          <div class="table-container">
            <el-table :data="doctorStats" size="default" border>
              <el-table-column type="index" label="排名" width="60" align="center">
                <template #default="{ $index }">
                  <span v-if="$index < 3" class="rank-badge" :class="'rank-' + ($index + 1)">
                    {{ $index + 1 }}
                  </span>
                  <span v-else>{{ $index + 1 }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="姓名" />
              <el-table-column prop="department" label="科室" width="100" />
              <el-table-column prop="examCount" label="检查人次" width="100" align="right" />
              <el-table-column prop="avgTime" label="平均耗时" width="100" align="right">
                <template #default="{ row }">{{ row.avgTime }}分</template>
              </el-table-column>
              <el-table-column prop="positiveCount" label="阳性检出数" width="110" align="right" />
            </el-table>
          </div>
        </el-card>
      </el-col>
      <el-col :span="24" :md="12">
        <el-card>
          <template #header>
            <span>科室忙闲热力图</span>
          </template>
          <div class="heatmap-container">
            <div class="floor-plan">
              <div class="floor-title">月度科室忙闲分布</div>
              <div class="rooms">
                <div 
                  v-for="room in heatmapData" 
                  :key="room.name" 
                  class="room"
                  :class="getHeatClass(room.heatLevel)"
                  :style="{ gridArea: room.area }"
                >
                  <div class="room-name">{{ room.name }}</div>
                  <div class="room-info">
                    <span>{{ room.personCount }}人</span>
                    <span>繁忙度 {{ room.heatLevel }}%</span>
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

    <div id="print-area" class="print-area">
      <div class="report-header">
        <h1 class="report-title">康健体检中心</h1>
        <h2 class="report-subtitle">月度运营质量报告</h2>
        <p class="report-date">报告月份：{{ formatReportMonth(selectedMonth) }}</p>
      </div>

      <div class="report-section">
        <h3 class="section-title">一、统计概览</h3>
        <div class="stat-cards-print">
          <div class="stat-card-print total">
            <div class="stat-label-print">体检总人次</div>
            <div class="stat-value-print">{{ stats.totalPerson }}</div>
          </div>
          <div class="stat-card-print positive">
            <div class="stat-label-print">阳性检出率</div>
            <div class="stat-value-print">{{ stats.positiveRate }}%</div>
          </div>
          <div class="stat-card-print avg">
            <div class="stat-label-print">平均耗时</div>
            <div class="stat-value-print">{{ stats.avgTime }}分钟</div>
          </div>
          <div class="stat-card-print satisfaction">
            <div class="stat-label-print">客户满意度</div>
            <div class="stat-value-print">{{ stats.satisfaction }}分</div>
          </div>
        </div>
      </div>

      <div class="report-section">
        <h3 class="section-title">二、套餐统计</h3>
        <table class="report-table">
          <thead>
            <tr>
              <th>套餐名称</th>
              <th>人次</th>
              <th>收入(元)</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(pkg, index) in packageStats" :key="index">
              <td>{{ pkg.name }}</td>
              <td align="right">{{ pkg.count }}</td>
              <td align="right">{{ formatMoney(pkg.income) }}</td>
              <td align="right">{{ pkg.ratio }}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="report-section">
        <h3 class="section-title">三、科室工作量统计</h3>
        <table class="report-table">
          <thead>
            <tr>
              <th>科室</th>
              <th>检查项次</th>
              <th>受检人数</th>
              <th>平均耗时(分钟)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(dept, index) in deptStats" :key="index">
              <td>{{ dept.name }}</td>
              <td align="right">{{ dept.examCount }}</td>
              <td align="right">{{ dept.personCount }}</td>
              <td align="right">{{ dept.avgTime }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="report-section">
        <h3 class="section-title">四、医生工作量排名</h3>
        <table class="report-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>姓名</th>
              <th>科室</th>
              <th>检查人次</th>
              <th>平均耗时</th>
              <th>阳性检出数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(doctor, index) in doctorStats" :key="index">
              <td align="center">{{ index + 1 }}</td>
              <td>{{ doctor.name }}</td>
              <td>{{ doctor.department }}</td>
              <td align="right">{{ doctor.examCount }}</td>
              <td align="right">{{ doctor.avgTime }}分</td>
              <td align="right">{{ doctor.positiveCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="report-section">
        <h3 class="section-title">五、科室忙闲热力图</h3>
        <div class="heatmap-print">
          <div class="floor-plan-print">
            <div class="rooms-print">
              <div 
                v-for="room in heatmapData" 
                :key="room.name" 
                class="room-print"
                :class="getHeatClass(room.heatLevel)"
                :style="{ gridArea: room.area }"
              >
                <div class="room-name-print">{{ room.name }}</div>
                <div class="room-info-print">
                  <span>{{ room.personCount }}人</span>
                </div>
              </div>
            </div>
          </div>
          <div class="heat-legend-print">
            <span>忙闲程度：</span>
            <span class="legend-item idle">空闲(0-30%)</span>
            <span class="legend-item normal">正常(30-60%)</span>
            <span class="legend-item busy">繁忙(60-80%)</span>
            <span class="legend-item overload">过载(80%+)</span>
          </div>
        </div>
      </div>

      <div class="report-section">
        <h3 class="section-title">六、备注说明</h3>
        <div class="remark-content">
          <p>1. 本报告数据统计周期为 {{ formatReportMonth(selectedMonth) }} 全月。</p>
          <p>2. 阳性检出率 = 检出阳性异常项的人次 / 总体检人次 × 100%。</p>
          <p>3. 平均耗时为从登记到完成所有检查项目的平均时长。</p>
          <p>4. 客户满意度来源于体检结束后的问卷调查，满分5分。</p>
          <p>5. 科室忙闲热力图反映各科室月度工作负荷相对水平。</p>
          <p>6. 本报告由康健体检中心信息系统自动生成。</p>
        </div>
      </div>

      <div class="report-footer">
        <p>报告生成时间：{{ currentTime }}</p>
        <p>康健体检中心 © 版权所有</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Download, User, Warning, Clock, Star } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const loading = ref(false)
const selectedMonth = ref(dayjs().format('YYYY-MM'))
const currentTime = ref('')

const stats = reactive({
  totalPerson: 0,
  positiveRate: 0,
  avgTime: 0,
  satisfaction: 0
})

const packageStats = ref([])
const deptStats = ref([])
const doctorStats = ref([])
const heatmapData = ref([])

const formatMoney = (value) => {
  return value.toLocaleString('zh-CN')
}

const formatReportMonth = (month) => {
  return dayjs(month + '-01').format('YYYY年M月')
}

const getHeatClass = (heat) => {
  if (heat >= 80) return 'overload'
  if (heat >= 60) return 'busy'
  if (heat >= 30) return 'normal'
  return 'idle'
}

const generateMockData = () => {
  const mockData = {
    stats: {
      totalPerson: 352,
      positiveRate: 64.8,
      avgTime: 85,
      satisfaction: 4.7
    },
    packageStats: [
      { name: '基础体检套餐A', count: 128, income: 76800, ratio: 36.4 },
      { name: '标准体检套餐B', count: 145, income: 188500, ratio: 41.2 },
      { name: '精英体检套餐C', count: 79, income: 237000, ratio: 22.4 }
    ],
    deptStats: [
      { name: '一般检查科', examCount: 352, personCount: 352, avgTime: 8 },
      { name: '检验科', examCount: 1056, personCount: 352, avgTime: 15 },
      { name: '超声科', examCount: 528, personCount: 352, avgTime: 20 },
      { name: '放射科', examCount: 316, personCount: 316, avgTime: 12 },
      { name: '功能科', examCount: 352, personCount: 352, avgTime: 10 },
      { name: '内科', examCount: 352, personCount: 352, avgTime: 12 },
      { name: '外科', examCount: 352, personCount: 352, avgTime: 8 }
    ],
    doctorStats: [
      { name: '王建国', department: '超声科', examCount: 186, avgTime: 18, positiveCount: 142 },
      { name: '张秀英', department: '内科', examCount: 165, avgTime: 12, positiveCount: 108 },
      { name: '刘志强', department: '检验科', examCount: 320, avgTime: 10, positiveCount: 218 },
      { name: '陈美玲', department: '放射科', examCount: 158, avgTime: 15, positiveCount: 87 },
      { name: '李伟华', department: '外科', examCount: 148, avgTime: 8, positiveCount: 56 },
      { name: '赵雅琴', department: '功能科', examCount: 175, avgTime: 10, positiveCount: 98 },
      { name: '孙德明', department: '一般检查科', examCount: 210, avgTime: 6, positiveCount: 45 }
    ],
    heatmapData: [
      { name: '一般检查科', area: 'r1', heatLevel: 45, personCount: 352 },
      { name: '采血室', area: 'r2', heatLevel: 85, personCount: 352 },
      { name: '超声-1室', area: 'r3', heatLevel: 92, personCount: 264 },
      { name: '超声-2室', area: 'r4', heatLevel: 78, personCount: 264 },
      { name: 'CT室', area: 'r5', heatLevel: 55, personCount: 158 },
      { name: '心电室', area: 'r6', heatLevel: 40, personCount: 176 },
      { name: '内科诊室', area: 'r7', heatLevel: 68, personCount: 352 },
      { name: '外科诊室', area: 'r8', heatLevel: 35, personCount: 352 }
    ]
  }
  return mockData
}

const fetchData = async () => {
  loading.value = true
  try {
    const [year, month] = selectedMonth.value.split('-').map(Number)
    
    if (window.api?.statistics?.getMonthlyData) {
      const data = await window.api.statistics.getMonthlyData(year, month)
      if (data) {
        Object.assign(stats, data.stats)
        packageStats.value = data.packageStats || []
        deptStats.value = data.deptStats || []
        doctorStats.value = data.doctorStats || []
        heatmapData.value = data.heatmapData || []
      }
    } else {
      const mockData = generateMockData()
      Object.assign(stats, mockData.stats)
      packageStats.value = mockData.packageStats
      deptStats.value = mockData.deptStats
      doctorStats.value = mockData.doctorStats
      heatmapData.value = mockData.heatmapData
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    const mockData = generateMockData()
    Object.assign(stats, mockData.stats)
    packageStats.value = mockData.packageStats
    deptStats.value = mockData.deptStats
    doctorStats.value = mockData.doctorStats
    heatmapData.value = mockData.heatmapData
  } finally {
    loading.value = false
    currentTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
  }
}

const exportPDF = () => {
  currentTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
  window.print()
}

onMounted(() => {
  fetchData()
})
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
  flex-wrap: wrap;
  gap: 12px;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 8px;
  color: white;
  margin-bottom: 20px;
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
  flex-shrink: 0;
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

.table-container {
  min-height: 200px;
}

.ratio-text {
  margin-left: 8px;
  font-size: 12px;
}

.rank-badge {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  border-radius: 50%;
  color: white;
  font-size: 12px;
  font-weight: bold;
  text-align: center;
}

.rank-1 { background: #f56c6c; }
.rank-2 { background: #e6a23c; }
.rank-3 { background: #67c23a; }

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
  padding: 16px 8px;
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
  font-size: 13px;
}

.room-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #606266;
}

.heat-legend {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  font-size: 12px;
  color: #606266;
  flex-wrap: wrap;
}

.legend-item {
  padding: 4px 12px;
  border-radius: 4px;
}

.legend-item.idle { background: #f0f9eb; color: #67c23a; }
.legend-item.normal { background: #ecf5ff; color: #409eff; }
.legend-item.busy { background: #fdf6ec; color: #e6a23c; }
.legend-item.overload { background: #fef0f0; color: #f56c6c; }

.print-area {
  display: none;
}

@media print {
  .no-print {
    display: none !important;
  }

  .print-area {
    display: block !important;
  }

  .statistics {
    display: block;
    gap: 0;
  }
}
</style>

<style>
@media print {
  @page {
    size: A4;
    margin: 15mm;
  }

  body {
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-area {
    display: block !important;
    font-family: "Microsoft YaHei", "SimHei", sans-serif;
    color: #303133;
  }

  .report-header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #409eff;
  }

  .report-title {
    font-size: 28px;
    margin: 0 0 10px 0;
    color: #303133;
    font-weight: bold;
  }

  .report-subtitle {
    font-size: 22px;
    margin: 0 0 15px 0;
    color: #409eff;
    font-weight: 500;
  }

  .report-date {
    font-size: 14px;
    margin: 0;
    color: #606266;
  }

  .report-section {
    margin-bottom: 25px;
    page-break-inside: avoid;
  }

  .section-title {
    font-size: 16px;
    font-weight: bold;
    margin: 0 0 15px 0;
    padding-left: 10px;
    border-left: 4px solid #409eff;
    color: #303133;
  }

  .stat-cards-print {
    display: flex;
    justify-content: space-between;
    gap: 15px;
  }

  .stat-card-print {
    flex: 1;
    padding: 20px 15px;
    border-radius: 8px;
    text-align: center;
    color: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .stat-card-print.total { background: #667eea; }
  .stat-card-print.positive { background: #f56c6c; }
  .stat-card-print.avg { background: #e6a23c; }
  .stat-card-print.satisfaction { background: #67c23a; }

  .stat-label-print {
    font-size: 13px;
    opacity: 0.95;
    margin-bottom: 8px;
  }

  .stat-value-print {
    font-size: 24px;
    font-weight: bold;
  }

  .report-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .report-table th {
    background: #ecf5ff;
    border: 1px solid #dcdfe6;
    padding: 10px 8px;
    text-align: left;
    font-weight: 500;
    color: #303133;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .report-table td {
    border: 1px solid #dcdfe6;
    padding: 8px;
    color: #606266;
  }

  .report-table tbody tr:nth-child(even) {
    background: #f5f7fa;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .heatmap-print {
    margin-top: 10px;
  }

  .floor-plan-print {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 16px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .rooms-print {
    display: grid;
    grid-template-areas:
      "r1 r2 r3 r4"
      "r5 r6 r7 r8";
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .room-print {
    padding: 15px 8px;
    border-radius: 8px;
    text-align: center;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .room-print.idle { background: #f0f9eb; border: 2px solid #67c23a; }
  .room-print.normal { background: #ecf5ff; border: 2px solid #409eff; }
  .room-print.busy { background: #fdf6ec; border: 2px solid #e6a23c; }
  .room-print.overload { background: #fef0f0; border: 2px solid #f56c6c; }

  .room-name-print {
    font-weight: 500;
    margin-bottom: 6px;
    color: #303133;
    font-size: 12px;
  }

  .room-info-print {
    font-size: 11px;
    color: #606266;
  }

  .heat-legend-print {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    font-size: 11px;
    color: #606266;
    flex-wrap: wrap;
  }

  .remark-content {
    font-size: 13px;
    color: #606266;
    line-height: 1.8;
  }

  .remark-content p {
    margin: 5px 0;
  }

  .report-footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #dcdfe6;
    text-align: center;
    font-size: 12px;
    color: #909399;
  }

  .report-footer p {
    margin: 5px 0;
  }
}
</style>
