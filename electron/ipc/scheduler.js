import dayjs from 'dayjs'
import { execQuery, execRun, execGet } from '../database/db.js'

export function sortExamItems(items, gender, fasting) {
  const fastingItems = []
  const nonFastingItems = []
  
  items.forEach(item => {
    if (item.gender_restriction && item.gender_restriction !== 'all' && item.gender_restriction !== gender) {
      return
    }
    
    if (item.require_fasting && fasting) {
      fastingItems.push(item)
    } else {
      nonFastingItems.push(item)
    }
  })
  
  const deptOrder = {
    '一般检查': 0,
    '检验科': 1,
    '超声科': 2,
    '放射科': 3,
    '功能科': 4,
    '内科': 5,
    '外科': 6,
    '眼科': 7,
    '耳鼻喉科': 8,
    '口腔科': 9,
    '妇科': 10
  }
  
  const sortByDept = (a, b) => {
    const orderA = deptOrder[a.department] ?? 99
    const orderB = deptOrder[b.department] ?? 99
    if (orderA !== orderB) return orderA - orderB
    return a.standard_duration - b.standard_duration
  }
  
  fastingItems.sort(sortByDept)
  nonFastingItems.sort(sortByDept)
  
  return [...fastingItems, ...nonFastingItems]
}

export function generateSchedule(date) {
  const appointments = execQuery(`
    SELECT a.*, p.name as package_name
    FROM appointments a
    JOIN packages p ON a.package_id = p.id
    WHERE a.appointment_date = ? AND a.status = 'scheduled'
    ORDER BY a.created_at
  `, [date])
  
  if (appointments.length === 0) {
    return { success: false, message: '当日没有预约记录' }
  }
  
  const doctors = execQuery(`
    SELECT ds.*, d.name, d.department, d.gender, ei.id as exam_item_id, ei.name as exam_item_name, ei.department as item_dept
    FROM doctor_schedules ds
    JOIN doctors d ON ds.doctor_id = d.id
    LEFT JOIN exam_items ei ON ds.exam_item_id = ei.id
    WHERE ds.schedule_date = ?
  `, [date])
  
  const equipment = execQuery("SELECT * FROM equipment WHERE status = ?", ['normal'])
  
  const existingSchedules = execQuery(`
    SELECT * FROM exam_schedules WHERE scheduled_date = ?
  `, [date])
  
  if (existingSchedules.length > 0) {
    execRun('DELETE FROM exam_schedules WHERE scheduled_date = ?', [date])
  }
  
  const doctorAvailability = {}
  doctors.forEach(doc => {
    const key = `${doc.doctor_id}_${doc.exam_item_id || 'any'}`
    doctorAvailability[key] = {
      doctor: doc,
      endTime: doc.start_time
    }
  })
  
  const equipmentAvailability = {}
  equipment.forEach(eq => {
    equipmentAvailability[eq.id] = {
      equipment: eq,
      endTime: null
    }
  })
  
  const results = []
  
  appointments.forEach((appt, apptIdx) => {
    const packageItems = execQuery(`
      SELECT pi.*, ei.name, ei.code, ei.department, ei.standard_duration,
             ei.require_fasting, ei.gender_restriction, ei.equipment_dependency
      FROM package_items pi
      JOIN exam_items ei ON pi.exam_item_id = ei.id
      WHERE pi.package_id = ?
    `, [appt.package_id])
    
    const sortedItems = sortExamItems(packageItems, appt.gender, appt.fasting)
    
    let currentTime = dayjs(`${date} 07:30`).add(apptIdx * 5, 'minute')
    const itemSchedules = []
    
    sortedItems.forEach((item, itemIdx) => {
      const duration = item.standard_duration
      
      let assignedDoctor = null
      let doctorKey = null
      let doctorStartTime = currentTime
      
      const matchingDoctors = Object.keys(doctorAvailability).filter(key => {
        const da = doctorAvailability[key]
        if (item.equipment_dependency && !da.doctor.exam_item_id) return true
        if (da.doctor.exam_item_id && da.doctor.exam_item_id !== item.id) return false
        return true
      })
      
      let earliestDoctor = null
      let earliestTime = null
      
      matchingDoctors.forEach(key => {
        const da = doctorAvailability[key]
        const docTime = dayjs(`${date} ${da.endTime}`)
        const startTime = docTime.isAfter(currentTime) ? docTime : currentTime
        
        if (!earliestTime || startTime.isBefore(earliestTime)) {
          earliestTime = startTime
          earliestDoctor = key
        }
      })
      
      if (earliestDoctor) {
        doctorKey = earliestDoctor
        assignedDoctor = doctorAvailability[earliestDoctor].doctor
        doctorStartTime = earliestTime
      }
      
      let assignedEquipment = null
      let equipmentStartTime = doctorStartTime
      
      if (item.equipment_dependency) {
        const matchingEquip = Object.values(equipmentAvailability).filter(ea => {
          return ea.equipment.type === item.equipment_dependency
        })
        
        let earliestEq = null
        let earliestEqTime = null
        
        matchingEquip.forEach(ea => {
          const eqTime = ea.endTime ? dayjs(ea.endTime) : doctorStartTime
          const startTime = eqTime.isAfter(doctorStartTime) ? eqTime : doctorStartTime
          
          if (!earliestEqTime || startTime.isBefore(earliestEqTime)) {
            earliestEqTime = startTime
            earliestEq = ea.equipment.id
          }
        })
        
        if (earliestEq) {
          assignedEquipment = equipmentAvailability[earliestEq]
          equipmentStartTime = earliestEqTime
        }
      }
      
      const startTime = equipmentStartTime
      const endTime = startTime.add(duration, 'minute')
      
      const room = getRoomForItem(item, assignedEquipment, assignedDoctor)
      
      const result = execRun(`
        INSERT INTO exam_schedules (appointment_id, exam_item_id, doctor_id, equipment_id,
                                    room, scheduled_date, start_time, end_time, sort_order, status, approval_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
      `, [
        appt.id, item.id,
        assignedDoctor ? assignedDoctor.doctor_id : null,
        assignedEquipment ? assignedEquipment.equipment.id : null,
        room,
        date,
        startTime.format('HH:mm'),
        endTime.format('HH:mm'),
        itemIdx
      ])
      
      if (doctorKey) {
        doctorAvailability[doctorKey].endTime = endTime.format('HH:mm')
      }
      
      if (assignedEquipment) {
        assignedEquipment.endTime = endTime.format('YYYY-MM-DD HH:mm')
      }
      
      currentTime = endTime
      
      itemSchedules.push({
        id: result.lastInsertRowid,
        exam_item_id: item.id,
        exam_item_name: item.name,
        department: item.department,
        start_time: startTime.format('HH:mm'),
        end_time: endTime.format('HH:mm'),
        duration,
        doctor: assignedDoctor ? assignedDoctor.name : null,
        equipment: assignedEquipment ? assignedEquipment.equipment.name : null,
        room
      })
    })
    
    results.push({
      appointment_id: appt.id,
      appointment_no: appt.appointment_no,
      patient_name: appt.name,
      gender: appt.gender,
      package_name: appt.package_name,
      items: itemSchedules
    })
  })
  
  return {
    success: true,
    message: `成功为 ${appointments.length} 位受检者生成排程`,
    data: results,
    totalAppointments: appointments.length,
    totalItems: results.reduce((sum, r) => sum + r.items.length, 0)
  }
}

function getRoomForItem(item, equipment, doctor) {
  if (equipment && equipment.room) {
    return equipment.room
  }
  
  const deptRooms = {
    '一般检查': '一般检查室',
    '检验科': '采血室',
    '内科': '内科诊室',
    '外科': '外科诊室',
    '眼科': '眼科诊室',
    '耳鼻喉科': '耳鼻喉诊室',
    '口腔科': '口腔科诊室',
    '妇科': '妇科诊室',
    '功能科': '功能检查室',
    '放射科': '放射科',
    '超声科': '超声科'
  }
  
  return deptRooms[item.department] || item.department
}
