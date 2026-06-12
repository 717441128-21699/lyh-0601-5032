export function initTables(db) {
  const sql = `
    CREATE TABLE IF NOT EXISTS exam_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL,
      standard_duration INTEGER NOT NULL DEFAULT 30,
      require_fasting INTEGER NOT NULL DEFAULT 0,
      gender_restriction TEXT DEFAULT 'all',
      equipment_dependency TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS package_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      exam_item_id INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
      FOREIGN KEY (exam_item_id) REFERENCES exam_items(id),
      UNIQUE(package_id, exam_item_id)
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      model TEXT,
      room TEXT,
      status TEXT NOT NULL DEFAULT 'normal',
      running_hours REAL NOT NULL DEFAULT 0,
      last_maintenance_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT,
      department TEXT NOT NULL,
      gender TEXT,
      phone TEXT,
      role TEXT DEFAULT 'doctor',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      exam_item_id INTEGER,
      schedule_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      shift_type TEXT DEFAULT 'morning',
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (exam_item_id) REFERENCES exam_items(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      age INTEGER,
      id_card TEXT,
      phone TEXT,
      package_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      time_slot TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      fasting INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES packages(id)
    );

    CREATE TABLE IF NOT EXISTS exam_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      exam_item_id INTEGER NOT NULL,
      doctor_id INTEGER,
      equipment_id INTEGER,
      room TEXT,
      scheduled_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      actual_start_time TEXT,
      actual_end_time TEXT,
      result TEXT,
      is_abnormal INTEGER DEFAULT 0,
      abnormal_level TEXT DEFAULT 'normal',
      approval_status TEXT DEFAULT 'pending',
      dept_confirm_status TEXT DEFAULT 'pending',
      report_generated INTEGER DEFAULT 0,
      report_time TEXT,
      chief_reviewed INTEGER DEFAULT 0,
      chief_review_time TEXT,
      chief_doctor_id INTEGER,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (exam_item_id) REFERENCES exam_items(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (equipment_id) REFERENCES equipment(id)
    );

    CREATE TABLE IF NOT EXISTS exam_status_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_schedule_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      operator TEXT,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_schedule_id) REFERENCES exam_schedules(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedule_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_schedule_id INTEGER NOT NULL,
      appointment_id INTEGER NOT NULL,
      apply_dept TEXT NOT NULL,
      apply_doctor_id INTEGER,
      apply_reason TEXT NOT NULL,
      original_start_time TEXT,
      original_end_time TEXT,
      original_room TEXT,
      original_doctor_id INTEGER,
      new_start_time TEXT,
      new_end_time TEXT,
      new_room TEXT,
      new_doctor_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      approve_doctor_id INTEGER,
      approve_remark TEXT,
      approve_time TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_schedule_id) REFERENCES exam_schedules(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    );

    CREATE TABLE IF NOT EXISTS exam_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_schedule_id INTEGER NOT NULL,
      appointment_id INTEGER NOT NULL,
      exam_item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      result_value TEXT,
      result_unit TEXT,
      result_status TEXT DEFAULT 'normal',
      abnormal_level TEXT DEFAULT 'normal',
      normal_range TEXT,
      description TEXT,
      operator TEXT,
      report_time TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_schedule_id) REFERENCES exam_schedules(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (exam_item_id) REFERENCES exam_items(id)
    );

    CREATE TABLE IF NOT EXISTS normal_ranges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_item_id INTEGER,
      item_code TEXT,
      item_name TEXT NOT NULL,
      gender TEXT DEFAULT 'all',
      min_age INTEGER DEFAULT 0,
      max_age INTEGER DEFAULT 200,
      min_value REAL,
      max_value REAL,
      unit TEXT,
      normal_description TEXT,
      abnormal_low TEXT,
      abnormal_high TEXT,
      critical_low REAL,
      critical_high REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'normal',
      content TEXT NOT NULL,
      related_id INTEGER,
      related_type TEXT,
      target_role TEXT DEFAULT 'all',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS supplies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      unit TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      safety_stock INTEGER NOT NULL DEFAULT 100,
      unit_price REAL DEFAULT 0,
      related_dept TEXT,
      usage_per_exam REAL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS supply_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supply_id INTEGER NOT NULL,
      exam_schedule_id INTEGER,
      appointment_id INTEGER,
      quantity INTEGER NOT NULL,
      operator TEXT,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supply_id) REFERENCES supplies(id)
    );

    CREATE TABLE IF NOT EXISTS satisfaction_surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER,
      overall_score INTEGER,
      department_score TEXT,
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chief_review_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      patient_name TEXT,
      abnormal_count INTEGER DEFAULT 0,
      critical_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      assigned_doctor_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `
  
  db.run(sql)
}

export function seedData(db) {
  const countResult = db.exec('SELECT COUNT(*) as count FROM exam_items')
  const itemCount = countResult.length > 0 ? countResult[0].values[0][0] : 0
  if (itemCount > 0) return

  const items = [
    ['身高体重', 'HW', '一般检查', 5, 0, 'all', null, '测量身高、体重、BMI'],
    ['血压', 'BP', '一般检查', 5, 0, 'all', null, '测量血压、心率'],
    ['血常规', 'CBC', '检验科', 10, 1, 'all', null, '血常规检查'],
    ['尿常规', 'URINE', '检验科', 10, 0, 'all', null, '尿常规检查'],
    ['肝功能', 'LIVER', '检验科', 15, 1, 'all', null, '肝功能检查'],
    ['肾功能', 'KIDNEY', '检验科', 15, 1, 'all', null, '肾功能检查'],
    ['空腹血糖', 'FBG', '检验科', 10, 1, 'all', null, '空腹血糖检测'],
    ['血脂', 'LIPID', '检验科', 15, 1, 'all', null, '血脂检查'],
    ['心电图', 'ECG', '功能科', 10, 0, 'all', 'ECG', '心电图检查'],
    ['胸部CT', 'CHEST_CT', '放射科', 15, 0, 'all', 'CT', '胸部CT平扫'],
    ['腹部彩超', 'ABD_US', '超声科', 20, 1, 'all', 'US', '腹部彩色超声'],
    ['甲状腺彩超', 'THY_US', '超声科', 15, 0, 'all', 'US', '甲状腺彩色超声'],
    ['乳腺彩超', 'BREAST_US', '超声科', 15, 0, 'female', 'US', '乳腺彩色超声'],
    ['前列腺彩超', 'PROSTATE_US', '超声科', 15, 0, 'male', 'US', '前列腺彩色超声'],
    ['妇科检查', 'GYN', '妇科', 20, 0, 'female', null, '妇科常规检查'],
    ['眼科检查', 'EYE', '眼科', 10, 0, 'all', null, '视力、眼压检查'],
    ['耳鼻喉检查', 'ENT', '耳鼻喉科', 10, 0, 'all', null, '耳鼻喉科检查'],
    ['口腔检查', 'DENTAL', '口腔科', 10, 0, 'all', null, '口腔常规检查'],
    ['内科检查', 'INTERNAL', '内科', 15, 0, 'all', null, '内科常规检查'],
    ['外科检查', 'SURGERY', '外科', 15, 0, 'all', null, '外科常规检查']
  ]

  const itemIds = {}
  items.forEach(item => {
    const stmt = db.prepare(`
      INSERT INTO exam_items (name, code, department, standard_duration, require_fasting, gender_restriction, equipment_dependency, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.bind(item)
    stmt.step()
    stmt.free()
    const idResult = db.exec('SELECT last_insert_rowid() as id')
    itemIds[item[1]] = idResult[0].values[0][0]
  })

  const packages = [
    ['基础体检套餐A', 'PKG_A', 580.00, '适用于健康人群的基础体检'],
    ['标准体检套餐B', 'PKG_B', 1280.00, '适用于中年人群的标准体检'],
    ['精英体检套餐C', 'PKG_C', 2580.00, '适用于高管的全面体检']
  ]

  const pkgIds = []
  packages.forEach(pkg => {
    const stmt = db.prepare(`
      INSERT INTO packages (name, code, price, description, is_active)
      VALUES (?, ?, ?, ?, 1)
    `)
    stmt.bind(pkg)
    stmt.step()
    stmt.free()
    const idResult = db.exec('SELECT last_insert_rowid() as id')
    pkgIds.push(idResult[0].values[0][0])
  })

  const pkgAItems = ['HW', 'BP', 'CBC', 'URINE', 'FBG', 'ECG', 'CHEST_CT', 'EYE', 'ENT', 'DENTAL', 'INTERNAL', 'SURGERY', 'LIVER', 'KIDNEY']
  const pkgBItems = ['HW', 'BP', 'CBC', 'URINE', 'LIVER', 'KIDNEY', 'FBG', 'LIPID', 'ECG', 'CHEST_CT', 'ABD_US', 'THY_US', 'EYE', 'ENT', 'DENTAL', 'INTERNAL', 'SURGERY']
  const pkgCItems = ['HW', 'BP', 'CBC', 'URINE', 'LIVER', 'KIDNEY', 'FBG', 'LIPID', 'ECG', 'CHEST_CT', 'ABD_US', 'THY_US', 'EYE', 'ENT', 'DENTAL', 'INTERNAL', 'SURGERY']

  const addPackageItems = (pkgId, itemCodes) => {
    itemCodes.forEach((code, idx) => {
      const stmt = db.prepare(`
        INSERT INTO package_items (package_id, exam_item_id, sort_order)
        VALUES (?, ?, ?)
      `)
      stmt.bind([pkgId, itemIds[code], idx])
      stmt.step()
      stmt.free()
    })
  }

  addPackageItems(pkgIds[0], pkgAItems)
  addPackageItems(pkgIds[1], pkgBItems)
  addPackageItems(pkgIds[2], pkgCItems)

  const equipment = [
    ['CT机', 'CT_01', 'CT', 'GE Revolution', 'CT-1室'],
    ['彩超机1', 'US_01', 'US', 'Philips EPIQ 7', '超声-1室'],
    ['彩超机2', 'US_02', 'US', 'Philips EPIQ 5', '超声-2室'],
    ['心电图机1', 'ECG_01', 'ECG', 'GE MAC 5500', '心电-1室'],
    ['心电图机2', 'ECG_02', 'ECG', 'GE MAC 2000', '心电-2室']
  ]

  equipment.forEach(eq => {
    const stmt = db.prepare(`
      INSERT INTO equipment (name, code, type, model, room, status)
      VALUES (?, ?, ?, ?, ?, 'normal')
    `)
    stmt.bind(eq)
    stmt.step()
    stmt.free()
  })

  const doctors = [
    ['张医生', '主任医师', '内科', 'male', '13800000001', 'doctor'],
    ['李医生', '副主任医师', '外科', 'female', '13800000002', 'doctor'],
    ['王医生', '主治医师', '超声科', 'female', '13800000003', 'doctor'],
    ['赵医生', '主治医师', '放射科', 'male', '13800000004', 'doctor'],
    ['陈医生', '主治医师', '功能科', 'female', '13800000005', 'doctor'],
    ['刘医生', '主任技师', '检验科', 'male', '13800000006', 'doctor'],
    ['孙医生', '主治医师', '眼科', 'female', '13800000007', 'doctor'],
    ['周医生', '主治医师', '耳鼻喉科', 'male', '13800000008', 'doctor'],
    ['吴医生', '主治医师', '口腔科', 'female', '13800000009', 'doctor'],
    ['郑医生', '主任医师', '妇科', 'female', '13800000010', 'doctor'],
    ['黄主任', '主任医师', '总检中心', 'male', '13800000011', 'chief']
  ]

  doctors.forEach(d => {
    const stmt = db.prepare(`
      INSERT INTO doctors (name, title, department, gender, phone, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.bind(d)
    stmt.step()
    stmt.free()
  })

  const supplies = [
    ['真空采血管-紫色', 'TUBE_PURPLE', '支', 485, 500, 1.5, '检验科', 2],
    ['真空采血管-黄色', 'TUBE_YELLOW', '支', 520, 500, 1.5, '检验科', 3],
    ['超声耦合剂', 'COUPLING', '瓶', 42, 50, 35.0, '超声科', 0.1],
    ['一次性尿杯', 'URINE_CUP', '个', 860, 1000, 0.3, '检验科', 1],
    ['一次性手套', 'GLOVES', '副', 180, 200, 0.8, null, 1],
    ['一次性口罩', 'MASK', '个', 850, 500, 0.5, null, 1]
  ]

  supplies.forEach(s => {
    const stmt = db.prepare(`
      INSERT INTO supplies (name, code, unit, stock, safety_stock, unit_price, related_dept, usage_per_exam)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.bind(s)
    stmt.step()
    stmt.free()
  })

  const normalRanges = [
    [itemIds.FBG, 'FBG', '空腹血糖', 'all', 0, 200, 3.9, 6.1, 'mmol/L', '血糖正常', '偏低', '偏高', 2.8, 11.1],
    [itemIds.LIPID, 'CHOL', '总胆固醇', 'all', 0, 200, 2.8, 5.2, 'mmol/L', '正常', '偏低', '偏高', null, 6.2],
    [itemIds.LIVER, 'ALT', '谷丙转氨酶', 'all', 0, 200, 0, 40, 'U/L', '正常', null, '偏高', null, 80],
    [itemIds.LIVER, 'AST', '谷草转氨酶', 'all', 0, 200, 0, 37, 'U/L', '正常', null, '偏高', null, 74],
    [itemIds.KIDNEY, 'CREA', '肌酐', 'all', 0, 200, 44, 133, 'μmol/L', '正常', null, '偏高', null, 180],
    [itemIds.BP, 'SBP', '收缩压', 'all', 18, 200, 90, 120, 'mmHg', '正常', '偏低', '偏高', null, 160],
    [itemIds.BP, 'DBP', '舒张压', 'all', 18, 200, 60, 80, 'mmHg', '正常', '偏低', '偏高', null, 100],
    [itemIds.HW, 'BMI', '体重指数', 'all', 18, 200, 18.5, 23.9, 'kg/m²', '正常', '偏瘦', '超重', null, 30]
  ]

  normalRanges.forEach(r => {
    const stmt = db.prepare(`
      INSERT INTO normal_ranges (exam_item_id, item_code, item_name, gender, min_age, max_age, min_value, max_value, unit, normal_description, abnormal_low, abnormal_high, critical_low, critical_high)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.bind(r)
    stmt.step()
    stmt.free()
  })

  const sampleAppts = [
    ['张三', 'male', 35, '110101199001010001', '13800000001', pkgIds[1], dayjsDate(-1), '上午', 1, ''],
    ['李四', 'female', 28, '110101199501010002', '13800000002', pkgIds[0], dayjsDate(-1), '上午', 1, ''],
    ['王五', 'male', 45, '110101198001010003', '13800000003', pkgIds[2], dayjsDate(-1), '上午', 1, ''],
    ['赵六', 'female', 32, '110101199201010004', '13800000004', pkgIds[1], dayjsDate(-1), '下午', 0, '']
  ]

  sampleAppts.forEach((a, idx) => {
    const apptNo = 'TJ' + a[6].replace(/-/g, '') + String(idx + 1).padStart(4, '0')
    const stmt = db.prepare(`
      INSERT INTO appointments (appointment_no, name, gender, age, id_card, phone, package_id, appointment_date, time_slot, status, fasting, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
    `)
    stmt.bind([apptNo, a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9]])
    stmt.step()
    stmt.free()
  })

  const alerts = [
    ['supply', 'warning', '真空采血管-紫色 库存低于安全线，剩余485支，请及时采购', null, null, 'admin'],
    ['supply', 'danger', '超声耦合剂 库存不足，剩余42瓶', null, null, 'admin'],
    ['supply', 'info', '一次性尿杯 库存充足，剩余860个', null, null, 'admin']
  ]

  alerts.forEach(a => {
    const stmt = db.prepare(`
      INSERT INTO alerts (type, level, content, related_id, related_type, target_role)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.bind(a)
    stmt.step()
    stmt.free()
  })
}

function dayjsDate(offsetDays) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
