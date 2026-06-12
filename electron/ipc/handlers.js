import { generateSchedule } from './scheduler.js'
import { execQuery, execRun, execGet, execAll } from '../database/db.js'
import dayjs from 'dayjs'

export function registerIpcHandlers(ipcMain) {
  ipcMain.handle('package:list', () => {
    const packages = execQuery('SELECT * FROM packages ORDER BY id')
    return packages.map(pkg => {
      const items = execQuery(`
        SELECT pi.*, ei.name, ei.code, ei.department, ei.standard_duration, 
               ei.require_fasting, ei.gender_restriction, ei.equipment_dependency
        FROM package_items pi
        JOIN exam_items ei ON pi.exam_item_id = ei.id
        WHERE pi.package_id = ?
        ORDER BY pi.sort_order
      `, [pkg.id])
      return { ...pkg, items }
    })
  })

  ipcMain.handle('package:get', (_, id) => {
    const pkg = execGet('SELECT * FROM packages WHERE id = ?', [id])
    if (!pkg) return null
    const items = execQuery(`
      SELECT pi.*, ei.name, ei.code, ei.department, ei.standard_duration,
             ei.require_fasting, ei.gender_restriction, ei.equipment_dependency
      FROM package_items pi
      JOIN exam_items ei ON pi.exam_item_id = ei.id
      WHERE pi.package_id = ?
      ORDER BY pi.sort_order
    `, [id])
    return { ...pkg, items }
  })

  ipcMain.handle('package:create', (_, data) => {
    const result = execRun(`
      INSERT INTO packages (name, code, price, description, is_active)
      VALUES (?, ?, ?, ?, 1)
    `, [data.name, data.code, data.price, data.description])
    
    const packageId = result.lastInsertRowid
    data.items.forEach((itemId, idx) => {
      execRun(`
        INSERT INTO package_items (package_id, exam_item_id, sort_order)
        VALUES (?, ?, ?)
      `, [packageId, itemId, idx])
    })
    return packageId
  })

  ipcMain.handle('package:update', (_, id, data) => {
    execRun(`
      UPDATE packages SET name=?, code=?, price=?, description=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `, [data.name, data.code, data.price, data.description, id])
    
    execRun('DELETE FROM package_items WHERE package_id = ?', [id])
    data.items.forEach((itemId, idx) => {
      execRun(`
        INSERT INTO package_items (package_id, exam_item_id, sort_order)
        VALUES (?, ?, ?)
      `, [id, itemId, idx])
    })
    return true
  })

  ipcMain.handle('package:remove', (_, id) => {
    execRun('DELETE FROM packages WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('examItem:list', () => {
    return execQuery('SELECT * FROM exam_items ORDER BY department, name')
  })

  ipcMain.handle('examItem:get', (_, id) => {
    return execGet('SELECT * FROM exam_items WHERE id = ?', [id])
  })

  ipcMain.handle('examItem:create', (_, data) => {
    const result = execRun(`
      INSERT INTO exam_items (name, code, department, standard_duration, require_fasting, gender_restriction, equipment_dependency, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [data.name, data.code, data.department, data.standard_duration, 
        data.require_fasting ? 1 : 0, data.gender_restriction || 'all', 
        data.equipment_dependency || null, data.description || null])
    return result.lastInsertRowid
  })

  ipcMain.handle('examItem:update', (_, id, data) => {
    execRun(`
      UPDATE exam_items SET name=?, code=?, department=?, standard_duration=?,
             require_fasting=?, gender_restriction=?, equipment_dependency=?, description=?,
             updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `, [data.name, data.code, data.department, data.standard_duration,
        data.require_fasting ? 1 : 0, data.gender_restriction || 'all',
        data.equipment_dependency || null, data.description || null, id])
    return true
  })

  ipcMain.handle('examItem:remove', (_, id) => {
    execRun('DELETE FROM exam_items WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('equipment:list', () => {
    return execQuery('SELECT * FROM equipment ORDER BY type, name')
  })

  ipcMain.handle('equipment:create', (_, data) => {
    const result = execRun(`
      INSERT INTO equipment (name, code, type, model, room, status)
      VALUES (?, ?, ?, ?, ?, 'normal')
    `, [data.name, data.code, data.type, data.model, data.room])
    return result.lastInsertRowid
  })

  ipcMain.handle('equipment:update', (_, id, data) => {
    execRun(`
      UPDATE equipment SET name=?, code=?, type=?, model=?, room=?, status=?
      WHERE id=?
    `, [data.name, data.code, data.type, data.model, data.room, data.status, id])
    return true
  })

  ipcMain.handle('equipment:remove', (_, id) => {
    execRun('DELETE FROM equipment WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('doctor:list', () => {
    return execQuery('SELECT * FROM doctors WHERE is_active = 1 ORDER BY department, name')
  })

  ipcMain.handle('doctor:chiefDoctors', () => {
    return execQuery("SELECT * FROM doctors WHERE role = 'chief' AND is_active = 1 ORDER BY name")
  })

  ipcMain.handle('doctor:create', (_, data) => {
    const result = execRun(`
      INSERT INTO doctors (name, title, department, gender, phone, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [data.name, data.title, data.department, data.gender, data.phone, data.role || 'doctor'])
    return result.lastInsertRowid
  })

  ipcMain.handle('doctor:update', (_, id, data) => {
    execRun(`
      UPDATE doctors SET name=?, title=?, department=?, gender=?, phone=?, role=?
      WHERE id=?
    `, [data.name, data.title, data.department, data.gender, data.phone, data.role || 'doctor', id])
    return true
  })

  ipcMain.handle('doctor:remove', (_, id) => {
    execRun('UPDATE doctors SET is_active = 0 WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('schedule:list', (_, date) => {
    const sql = date
      ? `SELECT ds.*, d.name as doctor_name, d.title, d.department, ei.name as exam_item_name
         FROM doctor_schedules ds
         JOIN doctors d ON ds.doctor_id = d.id
         LEFT JOIN exam_items ei ON ds.exam_item_id = ei.id
         WHERE ds.schedule_date = ?
         ORDER BY ds.start_time`
      : `SELECT ds.*, d.name as doctor_name, d.title, d.department, ei.name as exam_item_name
         FROM doctor_schedules ds
         JOIN doctors d ON ds.doctor_id = d.id
         LEFT JOIN exam_items ei ON ds.exam_item_id = ei.id
         ORDER BY ds.schedule_date, ds.start_time`
    return date ? execQuery(sql, [date]) : execQuery(sql)
  })

  ipcMain.handle('schedule:create', (_, data) => {
    const result = execRun(`
      INSERT INTO doctor_schedules (doctor_id, exam_item_id, schedule_date, start_time, end_time, shift_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [data.doctor_id, data.exam_item_id || null, data.schedule_date, 
        data.start_time, data.end_time, data.shift_type || 'morning'])
    return result.lastInsertRowid
  })

  ipcMain.handle('schedule:remove', (_, id) => {
    execRun('DELETE FROM doctor_schedules WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('appointment:list', (_, params = {}) => {
    let sql = `
      SELECT a.*, p.name as package_name, p.code as package_code, p.price
      FROM appointments a
      JOIN packages p ON a.package_id = p.id
      WHERE 1=1
    `
    const args = []
    if (params.date) {
      sql += ' AND a.appointment_date = ?'
      args.push(params.date)
    }
    if (params.status) {
      sql += ' AND a.status = ?'
      args.push(params.status)
    }
    if (params.keyword) {
      sql += ' AND (a.name LIKE ? OR a.appointment_no LIKE ? OR a.phone LIKE ?)'
      const kw = `%${params.keyword}%`
      args.push(kw, kw, kw)
    }
    sql += ' ORDER BY a.appointment_date DESC, a.created_at DESC'
    return execQuery(sql, args)
  })

  ipcMain.handle('appointment:get', (_, id) => {
    const appt = execGet(`
      SELECT a.*, p.name as package_name, p.code as package_code, p.price
      FROM appointments a
      JOIN packages p ON a.package_id = p.id
      WHERE a.id = ?
    `, [id])
    if (!appt) return null
    
    const items = execQuery(`
      SELECT pi.*, ei.name, ei.code, ei.department, ei.standard_duration,
             ei.require_fasting, ei.gender_restriction, ei.equipment_dependency
      FROM package_items pi
      JOIN exam_items ei ON pi.exam_item_id = ei.id
      WHERE pi.package_id = ?
      ORDER BY pi.sort_order
    `, [appt.package_id])
    return { ...appt, package_items: items }
  })

  ipcMain.handle('appointment:create', (_, data) => {
    const count = execGet('SELECT COUNT(*) as cnt FROM appointments WHERE appointment_date = ?', 
      [data.appointment_date])
    const apptNo = 'TJ' + dayjs(data.appointment_date).format('YYYYMMDD') + 
      String((count.cnt || 0) + 1).padStart(4, '0')
    
    const result = execRun(`
      INSERT INTO appointments (appointment_no, name, gender, age, id_card, phone,
                                package_id, appointment_date, time_slot, status, fasting, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
    `, [apptNo, data.name, data.gender, data.age || null, data.id_card || null, data.phone || null,
        data.package_id, data.appointment_date, data.time_slot || null,
        data.fasting ? 1 : 0, data.notes || null])
    return result.lastInsertRowid
  })

  ipcMain.handle('appointment:update', (_, id, data) => {
    execRun(`
      UPDATE appointments SET name=?, gender=?, age=?, id_card=?, phone=?,
             package_id=?, appointment_date=?, time_slot=?, fasting=?, notes=?
      WHERE id=?
    `, [data.name, data.gender, data.age || null, data.id_card || null, data.phone || null,
        data.package_id, data.appointment_date, data.time_slot || null,
        data.fasting ? 1 : 0, data.notes || null, id])
    return true
  })

  ipcMain.handle('appointment:remove', (_, id) => {
    execRun('DELETE FROM appointments WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('appointment:getByDate', (_, date) => {
    return execQuery(`
      SELECT a.*, p.name as package_name
      FROM appointments a
      JOIN packages p ON a.package_id = p.id
      WHERE a.appointment_date = ?
      ORDER BY a.created_at
    `, [date])
  })

  ipcMain.handle('examSchedule:generate', (_, date) => {
    return generateSchedule(date)
  })

  ipcMain.handle('examSchedule:list', (_, date) => {
    const schedules = execQuery(`
      SELECT es.*, a.name as patient_name, a.gender, a.age, a.appointment_no,
             ei.name as exam_item_name, ei.code as exam_item_code, ei.department,
             ei.standard_duration, ei.require_fasting, ei.gender_restriction,
             d.name as doctor_name, eq.name as equipment_name
      FROM exam_schedules es
      JOIN appointments a ON es.appointment_id = a.id
      JOIN exam_items ei ON es.exam_item_id = ei.id
      LEFT JOIN doctors d ON es.doctor_id = d.id
      LEFT JOIN equipment eq ON es.equipment_id = eq.id
      WHERE es.scheduled_date = ?
      ORDER BY es.start_time, es.sort_order
    `, [date])
    
    const grouped = {}
    schedules.forEach(s => {
      if (!grouped[s.appointment_id]) {
        grouped[s.appointment_id] = {
          appointment_id: s.appointment_id,
          patient_name: s.patient_name,
          gender: s.gender,
          age: s.age,
          appointment_no: s.appointment_no,
          scheduled_date: date,
          approval_status: s.approval_status,
          items: []
        }
      }
      grouped[s.appointment_id].items.push(s)
    })
    return Object.values(grouped)
  })

  ipcMain.handle('examSchedule:getByAppointment', (_, appointmentId) => {
    return execQuery(`
      SELECT es.*, ei.name as exam_item_name, ei.code as exam_item_code,
             ei.department, ei.standard_duration, d.name as doctor_name,
             eq.name as equipment_name, eq.room as equipment_room
      FROM exam_schedules es
      JOIN exam_items ei ON es.exam_item_id = ei.id
      LEFT JOIN doctors d ON es.doctor_id = d.id
      LEFT JOIN equipment eq ON es.equipment_id = eq.id
      WHERE es.appointment_id = ?
      ORDER BY es.sort_order
    `, [appointmentId])
  })

  ipcMain.handle('examSchedule:get', (_, id) => {
    return execGet(`
      SELECT es.*, a.name as patient_name, a.gender, a.age, a.appointment_no,
             ei.name as exam_item_name, ei.department, d.name as doctor_name,
             eq.name as equipment_name
      FROM exam_schedules es
      JOIN appointments a ON es.appointment_id = a.id
      JOIN exam_items ei ON es.exam_item_id = ei.id
      LEFT JOIN doctors d ON es.doctor_id = d.id
      LEFT JOIN equipment eq ON es.equipment_id = eq.id
      WHERE es.id = ?
    `, [id])
  })

  ipcMain.handle('examSchedule:approve', (_, date, status) => {
    execRun(`
      UPDATE exam_schedules SET approval_status = ?
      WHERE scheduled_date = ?
    `, [status, date])
    
    if (status === 'approved') {
      execRun(`
        UPDATE exam_schedules SET dept_confirm_status = 'pending_confirm'
        WHERE scheduled_date = ? AND approval_status = 'approved'
      `, [date])
      
      const departments = execQuery(`
        SELECT DISTINCT ei.department
        FROM exam_schedules es
        JOIN exam_items ei ON es.exam_item_id = ei.id
        WHERE es.scheduled_date = ?
      `, [date])
      
      departments.forEach(dept => {
        const count = execGet(`
          SELECT COUNT(*) as cnt FROM exam_schedules es
          JOIN exam_items ei ON es.exam_item_id = ei.id
          WHERE es.scheduled_date = ? AND ei.department = ? AND es.approval_status = 'approved'
        `, [date, dept.department])
        
        execRun(`
          INSERT INTO alerts (type, level, content, related_id, related_type, target_role, is_read)
          VALUES ('schedule', 'info', ?, ?, 'department', 'nurse', 0)
        `, [`${dept.department} 今日新排程已审批，共 ${count.cnt} 项检查待确认`, null])
      })
    }
    return true
  })

  ipcMain.handle('examSchedule:deptConfirm', (_, id, status) => {
    execRun(`
      UPDATE exam_schedules SET dept_confirm_status = ? WHERE id = ?
    `, [status, id])
    
    if (status === 'confirmed') {
      execRun(`
        INSERT INTO exam_status_logs (exam_schedule_id, status, operator, remark)
        VALUES (?, 'waiting', '科室确认', '科室确认接收')
      `, [id])
    }
    return true
  })

  ipcMain.handle('examSchedule:getDeptTasks', (_, department, date) => {
    return execQuery(`
      SELECT es.*, a.name as patient_name, a.gender, a.age, a.appointment_no,
             ei.name as exam_item_name, ei.code as exam_item_code
      FROM exam_schedules es
      JOIN appointments a ON es.appointment_id = a.id
      JOIN exam_items ei ON es.exam_item_id = ei.id
      WHERE ei.department = ? AND es.scheduled_date = ?
      ORDER BY es.start_time
    `, [department, date])
  })

  ipcMain.handle('examSchedule:updateStatus', (_, id, status) => {
    execRun('UPDATE exam_schedules SET status = ? WHERE id = ?', [status, id])
    return true
  })

  ipcMain.handle('examStatus:update', (_, examScheduleId, status, data = {}) => {
    let updates = 'status = ?'
    const args = [status]
    
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    
    if (status === 'in_progress') {
      updates += ', actual_start_time = ?'
      args.push(now)
    } else if (status === 'completed') {
      updates += ', actual_end_time = ?'
      args.push(now)
    } else if (status === 'report_generated') {
      updates += ', report_generated = 1, report_time = ?'
      args.push(now)
    }
    
    if (data.result) {
      updates += ', result = ?'
      args.push(data.result)
    }
    if (data.is_abnormal !== undefined) {
      updates += ', is_abnormal = ?'
      args.push(data.is_abnormal ? 1 : 0)
    }
    if (data.abnormal_level) {
      updates += ', abnormal_level = ?'
      args.push(data.abnormal_level)
    }
    
    args.push(examScheduleId)
    execRun(`UPDATE exam_schedules SET ${updates} WHERE id = ?`, args)
    
    execRun(`
      INSERT INTO exam_status_logs (exam_schedule_id, status, operator, remark)
      VALUES (?, ?, ?, ?)
    `, [examScheduleId, status, data.operator || '系统', data.remark || ''])
    
    const schedule = execGet(`
      SELECT es.*, a.appointment_no, a.name as patient_name, a.id as appointment_id
      FROM exam_schedules es
      JOIN appointments a ON es.appointment_id = a.id
      WHERE es.id = ?
    `, [examScheduleId])
    
    if (status === 'completed') {
      deductSuppliesForExam(examScheduleId, schedule.appointment_id)
    }
    
    const allItems = execGet(`
      SELECT COUNT(*) as cnt FROM exam_schedules WHERE appointment_id = ?
    `, [schedule.appointment_id])
    
    const completedItems = execGet(`
      SELECT COUNT(*) as cnt FROM exam_schedules 
      WHERE appointment_id = ? AND status = 'completed'
    `, [schedule.appointment_id])
    
    const reportItems = execGet(`
      SELECT COUNT(*) as cnt FROM exam_schedules 
      WHERE appointment_id = ? AND report_generated = 1
    `, [schedule.appointment_id])
    
    if (reportItems.cnt === allItems.cnt) {
      execRun(`
        UPDATE appointments SET status = 'all_reported' WHERE id = ?
      `, [schedule.appointment_id])
      
      createChiefReviewTask(schedule.appointment_id, schedule.patient_name)
    } else if (completedItems.cnt === allItems.cnt) {
      execRun(`
        UPDATE appointments SET status = 'all_completed' WHERE id = ?
      `, [schedule.appointment_id])
    } else if (status === 'in_progress') {
      const appt = execGet('SELECT status FROM appointments WHERE id = ?', [schedule.appointment_id])
      if (appt.status !== 'in_progress') {
        execRun(`
          UPDATE appointments SET status = 'in_progress' WHERE id = ?
        `, [schedule.appointment_id])
      }
    }
    
    return true
  })

  function deductSuppliesForExam(examScheduleId, appointmentId) {
    const schedule = execGet(`
      SELECT es.*, ei.department 
      FROM exam_schedules es 
      JOIN exam_items ei ON es.exam_item_id = ei.id 
      WHERE es.id = ?
    `, [examScheduleId])
    
    if (!schedule) return
    
    const dept = schedule.department
    
    const supplies = execQuery(`
      SELECT * FROM supplies 
      WHERE (related_dept = ? OR related_dept IS NULL) 
        AND stock > 0
    `, [dept])
    
    supplies.forEach(supply => {
      let shouldDeduct = false
      let qty = 1
      
      if (dept === '检验科' && (supply.code.includes('TUBE') || supply.code === 'URINE_CUP')) {
        shouldDeduct = true
        qty = Math.ceil(supply.usage_per_exam || 1)
      }
      if (dept === '超声科' && supply.code === 'COUPLING') {
        shouldDeduct = true
        qty = 1
      }
      
      if (shouldDeduct) {
        execRun(`
          UPDATE supplies SET stock = stock - ? WHERE id = ?
        `, [qty, supply.id])
        
        execRun(`
          INSERT INTO supply_usage_logs (supply_id, exam_schedule_id, appointment_id, quantity, operator, remark)
          VALUES (?, ?, ?, ?, '系统', ?)
        `, [supply.id, examScheduleId, appointmentId, qty, `${schedule.exam_item_name || dept}检查自动扣减`])
        
        const updated = execGet('SELECT * FROM supplies WHERE id = ?', [supply.id])
        if (updated && updated.stock <= updated.safety_stock) {
          const existingAlert = execGet(`
            SELECT * FROM alerts 
            WHERE type = 'supply' AND related_id = ? AND is_read = 0
            ORDER BY created_at DESC LIMIT 1
          `, [supply.id])
          
          if (!existingAlert) {
            const level = updated.stock <= updated.safety_stock * 0.5 ? 'danger' : 'warning'
            execRun(`
              INSERT INTO alerts (type, level, content, related_id, related_type, target_role, is_read)
              VALUES ('supply', ?, ?, ?, 'supply', 'admin', 0)
            `, [level, `${supply.name} 库存低于安全线，剩余 ${updated.stock} ${supply.unit}，请及时采购`, supply.id])
          }
        }
      }
    })
  }

  function createChiefReviewTask(appointmentId, patientName) {
    const abnormalItems = execQuery(`
      SELECT COUNT(*) as cnt FROM exam_schedules 
      WHERE appointment_id = ? AND is_abnormal = 1
    `, [appointmentId])
    
    const criticalItems = execQuery(`
      SELECT COUNT(*) as cnt FROM exam_schedules 
      WHERE appointment_id = ? AND abnormal_level = 'critical'
    `, [appointmentId])
    
    const existing = execGet(`
      SELECT * FROM chief_review_tasks WHERE appointment_id = ? AND status = 'pending'
    `, [appointmentId])
    
    if (existing) {
      execRun(`
        UPDATE chief_review_tasks 
        SET abnormal_count = ?, critical_count = ? 
        WHERE id = ?
      `, [abnormalItems[0].cnt, criticalItems[0].cnt, existing.id])
    } else {
      const chiefDoctors = execQuery("SELECT id FROM doctors WHERE role = 'chief' AND is_active = 1")
      const chiefId = chiefDoctors.length > 0 ? chiefDoctors[0].id : null
      
      execRun(`
        INSERT INTO chief_review_tasks (appointment_id, patient_name, abnormal_count, critical_count, status, assigned_doctor_id)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `, [appointmentId, patientName, abnormalItems[0].cnt, criticalItems[0].cnt, chiefId])
      
      execRun(`
        INSERT INTO alerts (type, level, content, related_id, related_type, target_role, is_read)
        VALUES ('chief_review', ?, ?, ?, 'chief_review', 'chief', 0)
      `, [
        criticalItems[0].cnt > 0 ? 'danger' : 'warning',
        `${patientName} 的体检报告已生成，待总检医师审核（异常 ${abnormalItems[0].cnt} 项，危急 ${criticalItems[0].cnt} 项）`,
        appointmentId
      ])
    }
  }

  ipcMain.handle('examStatus:getByAppointment', (_, appointmentId) => {
    return execQuery(`
      SELECT es.*, ei.name as exam_item_name, ei.department,
             d.name as doctor_name
      FROM exam_schedules es
      JOIN exam_items ei ON es.exam_item_id = ei.id
      LEFT JOIN doctors d ON es.doctor_id = d.id
      WHERE es.appointment_id = ?
      ORDER BY es.sort_order
    `, [appointmentId])
  })

  ipcMain.handle('examStatus:listToday', () => {
    const today = dayjs().format('YYYY-MM-DD')
    const appts = execQuery(`
      SELECT a.*, p.name as package_name
      FROM appointments a
      JOIN packages p ON a.package_id = p.id
      WHERE a.appointment_date = ?
      ORDER BY a.created_at
    `, [today])
    
    return appts.map(a => {
      const total = execGet('SELECT COUNT(*) as cnt FROM exam_schedules WHERE appointment_id = ?', [a.id])
      const completed = execGet(`
        SELECT COUNT(*) as cnt FROM exam_schedules 
        WHERE appointment_id = ? AND status = 'completed'
      `, [a.id])
      const first = execGet(`
        SELECT MIN(start_time) as first_time FROM exam_schedules 
        WHERE appointment_id = ?
      `, [a.id])
      
      const current = execGet(`
        SELECT ei.department, es.status
        FROM exam_schedules es
        JOIN exam_items ei ON es.exam_item_id = ei.id
        WHERE es.appointment_id = ? AND es.status IN ('in_progress', 'waiting')
        ORDER BY es.sort_order
        LIMIT 1
      `, [a.id])
      
      return {
        ...a,
        total_items: total.cnt,
        completed_items: completed.cnt,
        first_time: first.first_time,
        current_dept: current ? current.department : null,
        current_status: current ? current.status : null
      }
    })
  })

  ipcMain.handle('examStatus:getAlerts', () => {
    return execQuery(`
      SELECT * FROM alerts 
      WHERE is_read = 0 
      ORDER BY created_at DESC 
      LIMIT 20
    `)
  })

  ipcMain.handle('examStatus:getAllAlerts', (_, params = {}) => {
    let sql = 'SELECT * FROM alerts WHERE 1=1'
    const args = []
    
    if (params.type) {
      sql += ' AND type = ?'
      args.push(params.type)
    }
    if (params.level) {
      sql += ' AND level = ?'
      args.push(params.level)
    }
    if (params.unreadOnly) {
      sql += ' AND is_read = 0'
    }
    
    sql += ' ORDER BY created_at DESC LIMIT 100'
    return execQuery(sql, args)
  })

  ipcMain.handle('examStatus:markAlertRead', (_, id) => {
    execRun('UPDATE alerts SET is_read = 1 WHERE id = ?', [id])
    return true
  })

  ipcMain.handle('examStatus:markAllAlertsRead', () => {
    execRun('UPDATE alerts SET is_read = 1 WHERE is_read = 0')
    return true
  })

  ipcMain.handle('adjustment:create', (_, data) => {
    const schedule = execGet('SELECT * FROM exam_schedules WHERE id = ?', [data.exam_schedule_id])
    if (!schedule) throw new Error('排程不存在')
    
    const result = execRun(`
      INSERT INTO schedule_adjustments (
        exam_schedule_id, appointment_id, apply_dept, apply_doctor_id, apply_reason,
        original_start_time, original_end_time, original_room, original_doctor_id,
        new_start_time, new_end_time, new_room, new_doctor_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      data.exam_schedule_id, data.appointment_id, data.apply_dept,
      data.apply_doctor_id || null, data.apply_reason,
      schedule.start_time, schedule.end_time, schedule.room, schedule.doctor_id,
      data.new_start_time || schedule.start_time,
      data.new_end_time || schedule.end_time,
      data.new_room || schedule.room,
      data.new_doctor_id || schedule.doctor_id
    ])
    
    execRun(`
      INSERT INTO alerts (type, level, content, related_id, related_type, target_role, is_read)
      VALUES ('adjustment', 'warning', ?, ?, 'adjustment', 'chief', 0)
    `, [`${data.apply_dept} 提交了排程调整申请，请审批`, result.lastInsertRowid])
    
    return result.lastInsertRowid
  })

  ipcMain.handle('adjustment:list', (_, params = {}) => {
    let sql = `
      SELECT sa.*, a.name as patient_name, a.appointment_no,
             ei.name as exam_item_name, ei.department,
             d1.name as apply_doctor_name, d2.name as approve_doctor_name
      FROM schedule_adjustments sa
      JOIN appointments a ON sa.appointment_id = a.id
      JOIN exam_schedules es ON sa.exam_schedule_id = es.id
      JOIN exam_items ei ON es.exam_item_id = ei.id
      LEFT JOIN doctors d1 ON sa.apply_doctor_id = d1.id
      LEFT JOIN doctors d2 ON sa.approve_doctor_id = d2.id
      WHERE 1=1
    `
    const args = []
    
    if (params.status) {
      sql += ' AND sa.status = ?'
      args.push(params.status)
    }
    if (params.dept) {
      sql += ' AND ei.department = ?'
      args.push(params.dept)
    }
    
    sql += ' ORDER BY sa.created_at DESC LIMIT 100'
    return execQuery(sql, args)
  })

  ipcMain.handle('adjustment:approve', (_, id, approved, remark = '') => {
    const adjustment = execGet('SELECT * FROM schedule_adjustments WHERE id = ?', [id])
    if (!adjustment) throw new Error('申请不存在')
    
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    
    if (approved) {
      execRun(`
        UPDATE schedule_adjustments 
        SET status = 'approved', approve_remark = ?, approve_time = ?
        WHERE id = ?
      `, [remark, now, id])
      
      execRun(`
        UPDATE exam_schedules 
        SET start_time = ?, end_time = ?, room = ?, doctor_id = ?
        WHERE id = ?
      `, [
        adjustment.new_start_time, adjustment.new_end_time,
        adjustment.new_room, adjustment.new_doctor_id,
        adjustment.exam_schedule_id
      ])
      
      execRun(`
        INSERT INTO alerts (type, level, content, related_id, related_type, target_role, is_read)
        VALUES ('adjustment', 'success', ?, ?, 'adjustment', ?, 0)
      `, [`您的排程调整申请已通过审批`, adjustment.appointment_id, 'nurse'])
    } else {
      execRun(`
        UPDATE schedule_adjustments 
        SET status = 'rejected', approve_remark = ?, approve_time = ?
        WHERE id = ?
      `, [remark, now, id])
      
      execRun(`
        INSERT INTO alerts (type, level, content, related_id, related_type, target_role, is_read)
        VALUES ('adjustment', 'warning', ?, ?, 'adjustment', ?, 0)
      `, [`您的排程调整申请已被驳回：${remark}`, adjustment.appointment_id, 'nurse'])
    }
    
    return true
  })

  ipcMain.handle('examResult:list', (_, appointmentId) => {
    return execQuery(`
      SELECT er.*, ei.code as exam_item_code
      FROM exam_results er
      LEFT JOIN exam_items ei ON er.exam_item_id = ei.id
      WHERE er.appointment_id = ?
      ORDER BY er.created_at
    `, [appointmentId])
  })

  ipcMain.handle('examResult:create', (_, data) => {
    const result = execRun(`
      INSERT INTO exam_results (
        exam_schedule_id, appointment_id, exam_item_id, item_name,
        result_value, result_unit, result_status, abnormal_level,
        normal_range, description, operator, report_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.exam_schedule_id, data.appointment_id, data.exam_item_id,
      data.item_name, data.result_value || null, data.result_unit || null,
      data.result_status || 'normal', data.abnormal_level || 'normal',
      data.normal_range || null, data.description || null,
      data.operator || '系统', dayjs().format('YYYY-MM-DD HH:mm:ss')
    ])
    
    if (data.is_abnormal || data.abnormal_level !== 'normal') {
      const schedule = execGet('SELECT * FROM exam_schedules WHERE id = ?', [data.exam_schedule_id])
      if (schedule) {
        let level = 'normal'
        if (data.abnormal_level === 'critical') level = 'critical'
        else if (data.abnormal_level === 'high') level = 'high'
        else if (data.is_abnormal) level = 'abnormal'
        
        execRun(`
          UPDATE exam_schedules 
          SET is_abnormal = 1, abnormal_level = ?, result = ?
          WHERE id = ?
        `, [level, data.result_value || data.description || '', data.exam_schedule_id])
      }
    }
    
    return result.lastInsertRowid
  })

  ipcMain.handle('normalRange:list', (_, itemCode = null) => {
    if (itemCode) {
      return execQuery(`
        SELECT * FROM normal_ranges WHERE item_code = ? ORDER BY gender, min_age
      `, [itemCode])
    }
    return execQuery('SELECT * FROM normal_ranges ORDER BY item_name, gender')
  })

  ipcMain.handle('normalRange:check', (_, itemCode, value, gender = 'all', age = 30) => {
    const ranges = execQuery(`
      SELECT * FROM normal_ranges 
      WHERE item_code = ? 
        AND (gender = ? OR gender = 'all')
        AND min_age <= ? AND max_age >= ?
      ORDER BY CASE WHEN gender = ? THEN 0 ELSE 1 END
      LIMIT 1
    `, [itemCode, gender, age, age, gender])
    
    if (ranges.length === 0) {
      return { isNormal: true, level: 'normal', message: '无参考范围' }
    }
    
    const range = ranges[0]
    const numValue = parseFloat(value)
    
    if (isNaN(numValue)) {
      return { isNormal: true, level: 'normal', message: '非数值结果' }
    }
    
    let isNormal = true
    let level = 'normal'
    let message = range.normal_description || '正常'
    
    if (range.critical_high !== null && numValue >= range.critical_high) {
      isNormal = false
      level = 'critical'
      message = '危急值偏高，需立即处理'
    } else if (range.critical_low !== null && numValue <= range.critical_low) {
      isNormal = false
      level = 'critical'
      message = '危急值偏低，需立即处理'
    } else if (range.max_value !== null && numValue > range.max_value) {
      isNormal = false
      level = 'high'
      message = range.abnormal_high || '偏高'
    } else if (range.min_value !== null && numValue < range.min_value) {
      isNormal = false
      level = 'low'
      message = range.abnormal_low || '偏低'
    }
    
    return {
      isNormal,
      level,
      message,
      range: `${range.min_value || '-'} - ${range.max_value || '-'} ${range.unit || ''}`.trim(),
      unit: range.unit
    }
  })

  ipcMain.handle('supply:list', () => {
    const supplies = execQuery(`
      SELECT *, 
        CASE WHEN stock <= safety_stock * 0.5 THEN 'danger'
             WHEN stock <= safety_stock THEN 'warning'
             ELSE 'normal' END as stock_status
      FROM supplies
      ORDER BY stock_status, name
    `)
    return supplies
  })

  ipcMain.handle('supply:create', (_, data) => {
    const result = execRun(`
      INSERT INTO supplies (name, code, unit, stock, safety_stock, unit_price, related_dept, usage_per_exam)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.name, data.code, data.unit, data.stock || 0,
      data.safety_stock || 100, data.unit_price || 0,
      data.related_dept || null, data.usage_per_exam || 1
    ])
    return result.lastInsertRowid
  })

  ipcMain.handle('supply:update', (_, id, data) => {
    execRun(`
      UPDATE supplies SET name=?, code=?, unit=?, stock=?, safety_stock=?, 
             unit_price=?, related_dept=?, usage_per_exam=?
      WHERE id=?
    `, [
      data.name, data.code, data.unit, data.stock,
      data.safety_stock, data.unit_price, data.related_dept,
      data.usage_per_exam, id
    ])
    return true
  })

  ipcMain.handle('supply:adjustStock', (_, id, quantity, operator = '系统', remark = '') => {
    execRun('UPDATE supplies SET stock = stock + ? WHERE id = ?', [quantity, id])
    
    execRun(`
      INSERT INTO supply_usage_logs (supply_id, quantity, operator, remark)
      VALUES (?, ?, ?, ?)
    `, [id, quantity, operator, remark])
    
    const supply = execGet('SELECT * FROM supplies WHERE id = ?', [id])
    if (supply && supply.stock <= supply.safety_stock) {
      execRun(`
        INSERT INTO alerts (type, level, content, related_id, related_type, target_role, is_read)
        VALUES ('supply', 'warning', ?, ?, 'supply', 'admin', 0)
      `, [`${supply.name} 库存调整后为 ${supply.stock} ${supply.unit}，低于安全线`, id])
    }
    
    return true
  })

  ipcMain.handle('supply:usageLogs', (_, supplyId = null) => {
    let sql = `
      SELECT sul.*, s.name as supply_name, s.unit, a.name as patient_name
      FROM supply_usage_logs sul
      JOIN supplies s ON sul.supply_id = s.id
      LEFT JOIN appointments a ON sul.appointment_id = a.id
    `
    const args = []
    if (supplyId) {
      sql += ' WHERE sul.supply_id = ?'
      args.push(supplyId)
    }
    sql += ' ORDER BY sul.created_at DESC LIMIT 100'
    return supplyId ? execQuery(sql, args) : execQuery(sql)
  })

  ipcMain.handle('chiefReview:list', (_, status = null) => {
    let sql = `
      SELECT crt.*, d.name as doctor_name, a.appointment_no,
             p.name as package_name
      FROM chief_review_tasks crt
      LEFT JOIN doctors d ON crt.assigned_doctor_id = d.id
      LEFT JOIN appointments a ON crt.appointment_id = a.id
      LEFT JOIN packages p ON a.package_id = p.id
    `
    const args = []
    if (status) {
      sql += ' WHERE crt.status = ?'
      args.push(status)
    }
    sql += ' ORDER BY crt.created_at DESC'
    return status ? execQuery(sql, args) : execQuery(sql)
  })

  ipcMain.handle('chiefReview:complete', (_, taskId, doctorId, note = '') => {
    const task = execGet('SELECT * FROM chief_review_tasks WHERE id = ?', [taskId])
    if (!task) throw new Error('任务不存在')
    
    execRun(`
      UPDATE chief_review_tasks 
      SET status = 'completed', assigned_doctor_id = ?
      WHERE id = ?
    `, [doctorId, taskId])
    
    execRun(`
      UPDATE appointments SET status = 'chief_reviewed' WHERE id = ?
    `, [task.appointment_id])
    
    execRun(`
      UPDATE exam_schedules SET chief_reviewed = 1, chief_review_time = ?, chief_doctor_id = ?
      WHERE appointment_id = ?
    `, [dayjs().format('YYYY-MM-DD HH:mm:ss'), doctorId, task.appointment_id])
    
    return true
  })

  ipcMain.handle('statistics:getMonthlyData', (_, year, month) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD')
    
    const packageStats = execQuery(`
      SELECT p.id, p.name, p.code, COUNT(a.id) as count, SUM(p.price) as revenue
      FROM appointments a
      JOIN packages p ON a.package_id = p.id
      WHERE a.appointment_date BETWEEN ? AND ?
      GROUP BY p.id, p.name, p.code
      ORDER BY count DESC
    `, [startDate, endDate])
    
    const deptStats = execQuery(`
      SELECT ei.department, 
             COUNT(es.id) as exam_count,
             COUNT(DISTINCT es.appointment_id) as patient_count,
             AVG(
               CASE WHEN es.actual_start_time IS NOT NULL AND es.actual_end_time IS NOT NULL
               THEN (julianday(es.actual_end_time) - julianday(es.actual_start_time)) * 24 * 60
               ELSE NULL END
             ) as avg_duration_min
      FROM exam_schedules es
      JOIN exam_items ei ON es.exam_item_id = ei.id
      WHERE es.scheduled_date BETWEEN ? AND ?
      GROUP BY ei.department
      ORDER BY exam_count DESC
    `, [startDate, endDate])
    
    const doctorStats = execQuery(`
      SELECT d.id, d.name, d.department, d.title,
             COUNT(es.id) as exam_count,
             AVG(
               CASE WHEN es.actual_start_time IS NOT NULL AND es.actual_end_time IS NOT NULL
               THEN (julianday(es.actual_end_time) - julianday(es.actual_start_time)) * 24 * 60
               ELSE NULL END
             ) as avg_duration_min,
             SUM(CASE WHEN es.is_abnormal = 1 THEN 1 ELSE 0 END) as abnormal_count
      FROM doctors d
      LEFT JOIN exam_schedules es ON d.id = es.doctor_id
        AND es.scheduled_date BETWEEN ? AND ?
      WHERE d.is_active = 1
      GROUP BY d.id, d.name, d.department, d.title
      ORDER BY exam_count DESC
    `, [startDate, endDate])
    
    const abnormalStats = execQuery(`
      SELECT COUNT(*) as total_exams,
             SUM(CASE WHEN is_abnormal = 1 THEN 1 ELSE 0 END) as abnormal_count,
             ROUND(
               CASE WHEN COUNT(*) > 0 
               THEN SUM(CASE WHEN is_abnormal = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) 
               ELSE 0 END, 2
             ) as abnormal_rate
      FROM exam_schedules
      WHERE scheduled_date BETWEEN ? AND ? AND status = 'completed'
    `, [startDate, endDate])
    
    const satisfactionStats = execQuery(`
      SELECT 
        COUNT(*) as total_surveys,
        AVG(overall_score) as avg_score,
        ROUND(AVG(overall_score), 2) as avg_score_rounded
      FROM satisfaction_surveys
      WHERE created_at BETWEEN ? AND ?
    `, [startDate, endDate])
    
    const heatmapData = execQuery(`
      SELECT ei.department,
             COUNT(es.id) as exam_count,
             COUNT(DISTINCT es.appointment_id) as patient_count,
             AVG(
               CASE WHEN es.actual_start_time IS NOT NULL AND es.actual_end_time IS NOT NULL
               THEN (julianday(es.actual_end_time) - julianday(es.actual_start_time)) * 24 * 60
               ELSE NULL END
             ) as avg_wait_min
      FROM exam_schedules es
      JOIN exam_items ei ON es.exam_item_id = ei.id
      WHERE es.scheduled_date BETWEEN ? AND ?
      GROUP BY ei.department
      ORDER BY exam_count DESC
    `, [startDate, endDate])
    
    const summary = execGet(`
      SELECT 
        COUNT(DISTINCT a.id) as total_appointments,
        COUNT(es.id) as total_exams,
        SUM(CASE WHEN a.status IN ('all_completed', 'all_reported', 'chief_reviewed') THEN 1 ELSE 0 END) as completed_appointments
      FROM appointments a
      LEFT JOIN exam_schedules es ON a.id = es.appointment_id
      WHERE a.appointment_date BETWEEN ? AND ?
    `, [startDate, endDate])
    
    return {
      period: { year, month, startDate, endDate },
      summary,
      packageStats,
      deptStats,
      doctorStats,
      abnormalStats: abnormalStats[0],
      satisfactionStats: satisfactionStats[0],
      heatmapData
    }
  })

  ipcMain.handle('statistics:generateReportHTML', (_, year, month) => {
    const data = generateMonthlyReport(year, month)
    return data
  })

  function generateMonthlyReport(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD')
    
    const packageStats = execQuery(`
      SELECT p.id, p.name, p.code, COUNT(a.id) as count, SUM(p.price) as revenue
      FROM appointments a
      JOIN packages p ON a.package_id = p.id
      WHERE a.appointment_date BETWEEN ? AND ?
      GROUP BY p.id, p.name, p.code
      ORDER BY count DESC
    `, [startDate, endDate])
    
    const deptStats = execQuery(`
      SELECT ei.department, 
             COUNT(es.id) as exam_count,
             COUNT(DISTINCT es.appointment_id) as patient_count
      FROM exam_schedules es
      JOIN exam_items ei ON es.exam_item_id = ei.id
      WHERE es.scheduled_date BETWEEN ? AND ?
      GROUP BY ei.department
      ORDER BY exam_count DESC
    `, [startDate, endDate])
    
    const doctorStats = execQuery(`
      SELECT d.id, d.name, d.department,
             COUNT(es.id) as exam_count
      FROM doctors d
      LEFT JOIN exam_schedules es ON d.id = es.doctor_id
        AND es.scheduled_date BETWEEN ? AND ?
      WHERE d.is_active = 1
      GROUP BY d.id, d.name, d.department
      ORDER BY exam_count DESC
    `, [startDate, endDate])
    
    const abnormalRate = execGet(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_abnormal = 1 THEN 1 ELSE 0 END) as abnormal,
        ROUND(CASE WHEN COUNT(*) > 0 THEN SUM(CASE WHEN is_abnormal = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) ELSE 0 END, 2) as rate
      FROM exam_schedules
      WHERE scheduled_date BETWEEN ? AND ? AND status = 'completed'
    `, [startDate, endDate])
    
    const totalAppts = execGet(`
      SELECT COUNT(*) as cnt FROM appointments 
      WHERE appointment_date BETWEEN ? AND ?
    `, [startDate, endDate])
    
    const avgDuration = execGet(`
      SELECT ROUND(AVG(
        CASE WHEN actual_start_time IS NOT NULL AND actual_end_time IS NOT NULL
        THEN (julianday(actual_end_time) - julianday(actual_start_time)) * 24 * 60
        ELSE NULL END
      ), 1) as avg_min
      FROM exam_schedules
      WHERE scheduled_date BETWEEN ? AND ? AND status = 'completed'
    `, [startDate, endDate])
    
    const heatmapData = execQuery(`
      SELECT ei.department, COUNT(es.id) as exam_count
      FROM exam_schedules es
      JOIN exam_items ei ON es.exam_item_id = ei.id
      WHERE es.scheduled_date BETWEEN ? AND ?
      GROUP BY ei.department
      ORDER BY exam_count DESC
    `, [startDate, endDate])
    
    let maxCount = 1
    if (heatmapData.length > 0) {
      maxCount = Math.max(...heatmapData.map(d => d.exam_count))
    }
    
    return {
      year, month, startDate, endDate,
      totalAppointments: totalAppts.cnt,
      totalExams: abnormalRate.total,
      abnormalRate: abnormalRate.rate,
      avgDuration: avgDuration.avg_min || 0,
      packageStats,
      deptStats,
      doctorStats,
      heatmapData: heatmapData.map(d => ({
        ...d,
        intensity: Math.min(1, d.exam_count / maxCount)
      }))
    }
  }

  ipcMain.handle('satisfaction:submit', (_, data) => {
    const result = execRun(`
      INSERT INTO satisfaction_surveys (appointment_id, overall_score, department_score, comment)
      VALUES (?, ?, ?, ?)
    `, [data.appointment_id || null, data.overall_score || null,
        data.department_score || null, data.comment || null])
    return result.lastInsertRowid
  })
}
