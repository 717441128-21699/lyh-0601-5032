import { contextBridge, ipcRenderer } from 'electron'

const api = {
  package: {
    list: () => ipcRenderer.invoke('package:list'),
    get: (id) => ipcRenderer.invoke('package:get', id),
    create: (data) => ipcRenderer.invoke('package:create', data),
    update: (id, data) => ipcRenderer.invoke('package:update', id, data),
    remove: (id) => ipcRenderer.invoke('package:remove', id)
  },
  examItem: {
    list: () => ipcRenderer.invoke('examItem:list'),
    get: (id) => ipcRenderer.invoke('examItem:get', id),
    create: (data) => ipcRenderer.invoke('examItem:create', data),
    update: (id, data) => ipcRenderer.invoke('examItem:update', id, data),
    remove: (id) => ipcRenderer.invoke('examItem:remove', id)
  },
  equipment: {
    list: () => ipcRenderer.invoke('equipment:list'),
    get: (id) => ipcRenderer.invoke('equipment:get', id),
    create: (data) => ipcRenderer.invoke('equipment:create', data),
    update: (id, data) => ipcRenderer.invoke('equipment:update', id, data),
    remove: (id) => ipcRenderer.invoke('equipment:remove', id)
  },
  doctor: {
    list: () => ipcRenderer.invoke('doctor:list'),
    chiefDoctors: () => ipcRenderer.invoke('doctor:chiefDoctors'),
    get: (id) => ipcRenderer.invoke('doctor:get', id),
    create: (data) => ipcRenderer.invoke('doctor:create', data),
    update: (id, data) => ipcRenderer.invoke('doctor:update', id, data),
    remove: (id) => ipcRenderer.invoke('doctor:remove', id)
  },
  schedule: {
    list: (date) => ipcRenderer.invoke('schedule:list', date),
    create: (data) => ipcRenderer.invoke('schedule:create', data),
    update: (id, data) => ipcRenderer.invoke('schedule:update', id, data),
    remove: (id) => ipcRenderer.invoke('schedule:remove', id)
  },
  appointment: {
    list: (params) => ipcRenderer.invoke('appointment:list', params),
    get: (id) => ipcRenderer.invoke('appointment:get', id),
    create: (data) => ipcRenderer.invoke('appointment:create', data),
    update: (id, data) => ipcRenderer.invoke('appointment:update', id, data),
    remove: (id) => ipcRenderer.invoke('appointment:remove', id),
    getByDate: (date) => ipcRenderer.invoke('appointment:getByDate', date)
  },
  examSchedule: {
    generate: (date) => ipcRenderer.invoke('examSchedule:generate', date),
    list: (date) => ipcRenderer.invoke('examSchedule:list', date),
    get: (id) => ipcRenderer.invoke('examSchedule:get', id),
    getByAppointment: (appointmentId) => ipcRenderer.invoke('examSchedule:getByAppointment', appointmentId),
    approve: (date, status) => ipcRenderer.invoke('examSchedule:approve', date, status),
    deptConfirm: (id, status) => ipcRenderer.invoke('examSchedule:deptConfirm', id, status),
    getDeptTasks: (department, date) => ipcRenderer.invoke('examSchedule:getDeptTasks', department, date),
    updateStatus: (id, status) => ipcRenderer.invoke('examSchedule:updateStatus', id, status)
  },
  examStatus: {
    update: (examScheduleId, status, data) => ipcRenderer.invoke('examStatus:update', examScheduleId, status, data),
    getByAppointment: (appointmentId) => ipcRenderer.invoke('examStatus:getByAppointment', appointmentId),
    listToday: () => ipcRenderer.invoke('examStatus:listToday'),
    getAlerts: () => ipcRenderer.invoke('examStatus:getAlerts'),
    getAllAlerts: (params) => ipcRenderer.invoke('examStatus:getAllAlerts', params),
    markAlertRead: (id) => ipcRenderer.invoke('examStatus:markAlertRead', id),
    markAllAlertsRead: () => ipcRenderer.invoke('examStatus:markAllAlertsRead')
  },
  adjustment: {
    create: (data) => ipcRenderer.invoke('adjustment:create', data),
    list: (params) => ipcRenderer.invoke('adjustment:list', params),
    approve: (id, approved, remark) => ipcRenderer.invoke('adjustment:approve', id, approved, remark)
  },
  examResult: {
    list: (appointmentId) => ipcRenderer.invoke('examResult:list', appointmentId),
    create: (data) => ipcRenderer.invoke('examResult:create', data)
  },
  normalRange: {
    list: (itemCode) => ipcRenderer.invoke('normalRange:list', itemCode),
    check: (itemCode, value, gender, age) => ipcRenderer.invoke('normalRange:check', itemCode, value, gender, age)
  },
  supply: {
    list: () => ipcRenderer.invoke('supply:list'),
    create: (data) => ipcRenderer.invoke('supply:create', data),
    update: (id, data) => ipcRenderer.invoke('supply:update', id, data),
    adjustStock: (id, quantity, operator, remark) => ipcRenderer.invoke('supply:adjustStock', id, quantity, operator, remark),
    usageLogs: (supplyId) => ipcRenderer.invoke('supply:usageLogs', supplyId)
  },
  chiefReview: {
    list: (status) => ipcRenderer.invoke('chiefReview:list', status),
    complete: (taskId, doctorId, note) => ipcRenderer.invoke('chiefReview:complete', taskId, doctorId, note)
  },
  statistics: {
    getMonthlyData: (year, month) => ipcRenderer.invoke('statistics:getMonthlyData', year, month),
    generateReportHTML: (year, month) => ipcRenderer.invoke('statistics:generateReportHTML', year, month)
  },
  satisfaction: {
    submit: (data) => ipcRenderer.invoke('satisfaction:submit', data)
  }
}

contextBridge.exposeInMainWorld('api', api)
