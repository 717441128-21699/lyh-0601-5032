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
      approval_status TEXT DEFAULT 'pending',
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

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'normal',
      content TEXT NOT NULL,
      related_id INTEGER,
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
      unit_price REAL DEFAULT 0
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
    ['张医生', '主任医师', '内科', 'male', '13800000001'],
    ['李医生', '副主任医师', '外科', 'female', '13800000002'],
    ['王医生', '主治医师', '超声科', 'female', '13800000003'],
    ['赵医生', '主治医师', '放射科', 'male', '13800000004'],
    ['陈医生', '主治医师', '功能科', 'female', '13800000005'],
    ['刘医生', '主任技师', '检验科', 'male', '13800000006'],
    ['孙医生', '主治医师', '眼科', 'female', '13800000007'],
    ['周医生', '主治医师', '耳鼻喉科', 'male', '13800000008'],
    ['吴医生', '主治医师', '口腔科', 'female', '13800000009'],
    ['郑医生', '主任医师', '妇科', 'female', '13800000010']
  ]

  doctors.forEach(d => {
    const stmt = db.prepare(`
      INSERT INTO doctors (name, title, department, gender, phone)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.bind(d)
    stmt.step()
    stmt.free()
  })

  const supplies = [
    ['真空采血管-紫色', 'TUBE_PURPLE', '支', 5000, 500, 1.5],
    ['真空采血管-黄色', 'TUBE_YELLOW', '支', 5000, 500, 1.5],
    ['超声耦合剂', 'COUPLING', '瓶', 200, 50, 35.0],
    ['一次性尿杯', 'URINE_CUP', '个', 8000, 1000, 0.3]
  ]

  supplies.forEach(s => {
    const stmt = db.prepare(`
      INSERT INTO supplies (name, code, unit, stock, safety_stock, unit_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.bind(s)
    stmt.step()
    stmt.free()
  })
}
