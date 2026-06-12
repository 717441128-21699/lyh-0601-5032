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

  ipcMain.handle('doctor:create', (_, data) => {
    const result = execRun(`
      INSERT INTO doctors (name, title, department, gender, phone)
      VALUES (?, ?, ?, ?, ?)
    `, [data.name, data.title, data.department, data.gender, data.phone])
    return result.lastInsertRowid
  })

  ipcMain.handle('doctor:update', (_, id, data) => {
    execRun(`
      UPDATE doctors SET name=?, title=?, department=?, gender=?, phone=?
      WHERE id=?
    `, [data.name, data.title, data.department, data.gender, data.phone, id])
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
      SELECT es.*, a.name as patient_name, a.gender, a.appointment_no,
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
             eq.name as equipment_name
      FROM exam_schedules es
      JOIN exam_items ei ON es.exam_item_id = ei.id
      LEFT JOIN doctors d ON es.doctor_id = d.id
      LEFT JOIN equipment eq ON es.equipment_id = eq.id
      WHERE es.appointment_id = ?
      ORDER BY es.sort_order
    `, [appointmentId])
  })

  ipcMain.handle('examSchedule:approve', (_, date, status) => {
    execRun(`
      UPDATE exam_schedules SET approval_status = ?
      WHERE scheduled_date = ?
    `, [status, date])
    return true
  })

  ipcMain.handle('examSchedule:updateStatus', (_, id, status) => {
    execRun('UPDATE exam_schedules SET status = ? WHERE id = ?', [status, id])
    return true
  })

  ipcMain.handle('examStatus:update', (_, examScheduleId, status, data = {}) => {
    let updates = 'status = ?'
    const args = [status]
    
    if (status === 'in_progress') {
      updates += ', actual_start_time = ?'
      args.push(dayjs().format('YYYY-MM-DD HH:mm:ss'))
    } else if (status === 'completed') {
      updates += ', actual_end_time = ?'
      args.push(dayjs().format('YYYY-MM-DD HH:mm:ss'))
    }
    if (data.result) {
      updates += ', result = ?'
      args.push(data.result)
    }
    if (data.is_abnormal !== undefined) {
      updates += ', is_abnormal = ?'
      args.push(data.is_abnormal ? 1 : 0)
    }
    
    args.push(examScheduleId)
    execRun(`UPDATE exam_schedules SET ${updates} WHERE id = ?`, args)
    
    execRun(`
      INSERT INTO exam_status_logs (exam_schedule_id, status, operator, remark)
      VALUES (?, ?, ?, ?)
    `, [examScheduleId, status, data.operator || '系统', data.remark || ''])
    
    const schedule = execGet(`
      SELECT es.*, a.appointment_no, a.name as patient_name
      FROM exam_schedules es
      JOIN appointments a ON es.appointment_id = a.id
      WHERE es.id = ?
    `, [examScheduleId])
    
    const allItems = execGet(`
      SELECT COUNT(*) as cnt FROM exam_schedules WHERE appointment_id = ?
    `, [schedule.appointment_id])
    
    const completedItems = execGet(`
      SELECT COUNT(*) as cnt FROM exam_schedules 
      WHERE appointment_id = ? AND status = 'completed'
    `, [schedule.appointment_id])
    
    if (completedItems.cnt === allItems.cnt) {
      execRun(`
        UPDATE appointments SET status = 'all_completed' WHERE id = ?
      `, [schedule.appointment_id])
    } else if (status === 'in_progress') {
      execRun(`
        UPDATE appointments SET status = 'in_progress' WHERE id = ?
      `, [schedule.appointment_id])
    }
    
    return true
  })

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
      
      return {
        ...a,
        total_items: total.cnt,
        completed_items: completed.cnt,
        first_time: first.first_time
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
}
