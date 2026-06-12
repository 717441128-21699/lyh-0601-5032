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
    getByAppointment: (appointmentId) => ipcRenderer.invoke('examSchedule:getByAppointment', appointmentId),
    approve: (date, status) => ipcRenderer.invoke('examSchedule:approve', date, status),
    updateStatus: (id, status) => ipcRenderer.invoke('examSchedule:updateStatus', id, status)
  },
  examStatus: {
    update: (examScheduleId, status, data) => ipcRenderer.invoke('examStatus:update', examScheduleId, status, data),
    getByAppointment: (appointmentId) => ipcRenderer.invoke('examStatus:getByAppointment', appointmentId),
    listToday: () => ipcRenderer.invoke('examStatus:listToday'),
    getAlerts: () => ipcRenderer.invoke('examStatus:getAlerts')
  }
}

contextBridge.exposeInMainWorld('api', api)
