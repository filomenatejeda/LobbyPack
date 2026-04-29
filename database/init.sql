CREATE TABLE IF NOT EXISTS Users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role ENUM('admin', 'concierge', 'resident') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Admins (
  user_id VARCHAR(64) PRIMARY KEY,
  admin_name VARCHAR(100),
  admin_password_hash VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES Users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Concierges (
  user_id VARCHAR(64) PRIMARY KEY,
  concierge_name VARCHAR(100) NOT NULL,
  concierge_password_hash VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES Users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Residents (
  user_id VARCHAR(64) PRIMARY KEY,
  resident_name VARCHAR(100) NOT NULL,
  resident_password_hash VARCHAR(255),
  user_phone_number VARCHAR(12),
  department_address VARCHAR(100) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Businesses (
  id VARCHAR(64) PRIMARY KEY,
  business_name VARCHAR(100) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Buildings (
  id VARCHAR(64) PRIMARY KEY,
  building_name VARCHAR(100) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  reception_hours VARCHAR(100) NOT NULL,
  address_line VARCHAR(255) NOT NULL,
  access_password VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS BuildingPreferences (
  building_id VARCHAR(64) PRIMARY KEY,
  package_notifications BOOLEAN DEFAULT TRUE,
  daily_summary BOOLEAN DEFAULT TRUE,
  qr_access BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (building_id) REFERENCES Buildings(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS CommunityRegistrations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  community_name VARCHAR(255) NOT NULL,
  community_type VARCHAR(100) NOT NULL DEFAULT 'Otro',
  community_country VARCHAR(100) NOT NULL,
  community_location VARCHAR(255) NOT NULL,
  community_address VARCHAR(255) NOT NULL,
  address_fingerprint VARCHAR(512) UNIQUE NOT NULL,
  admin_first_name VARCHAR(100) NOT NULL,
  admin_last_name VARCHAR(100) NOT NULL,
  admin_email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Towers (
  id BIGINT PRIMARY KEY,
  building_id VARCHAR(64) NOT NULL,
  tower_name VARCHAR(100) NOT NULL,
  display_order INT NOT NULL,
  FOREIGN KEY (building_id) REFERENCES Buildings(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Floors (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tower_id BIGINT NOT NULL,
  floor_number INT NOT NULL,
  UNIQUE KEY unique_tower_floor (tower_id, floor_number),
  FOREIGN KEY (tower_id) REFERENCES Towers(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Apartments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  floor_id BIGINT NOT NULL,
  apartment_name VARCHAR(50) NOT NULL,
  display_order INT NOT NULL,
  UNIQUE KEY unique_floor_apartment (floor_id, apartment_name),
  FOREIGN KEY (floor_id) REFERENCES Floors(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Parcels (
  id VARCHAR(64) PRIMARY KEY,
  id_concierge VARCHAR(64) NOT NULL,
  id_resident VARCHAR(64) NOT NULL,
  id_business VARCHAR(64) NOT NULL,
  withdrawal_code VARCHAR(64),
  qr_code_url TEXT,
  parcel_status ENUM('pending', 'claimed') NOT NULL DEFAULT 'pending',
  parcel_description TEXT,
  is_urgent BOOLEAN DEFAULT FALSE,
  pending_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed_date TIMESTAMP NULL,
  FOREIGN KEY (id_concierge) REFERENCES Users(id),
  FOREIGN KEY (id_resident) REFERENCES Users(id),
  FOREIGN KEY (id_business) REFERENCES Businesses(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS Issues (
  id VARCHAR(64) PRIMARY KEY,
  id_parcel VARCHAR(64) NOT NULL,
  issue_status ENUM('open', 'under_review', 'resolved') NOT NULL DEFAULT 'open',
  issue_description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_parcel) REFERENCES Parcels(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

INSERT INTO Buildings (
  id,
  building_name,
  contact_email,
  reception_hours,
  address_line,
  access_password,
  is_active
)
SELECT
  'building-main',
  'LobbyPack Plaza Sur',
  'recepcion@lobbypack.cl',
  '08:00 a 22:00',
  'Av. Plaza Sur 245, Santiago',
  '1234',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM Buildings WHERE id = 'building-main'
);

INSERT INTO BuildingPreferences (
  building_id,
  package_notifications,
  daily_summary,
  qr_access
)
SELECT
  'building-main',
  TRUE,
  TRUE,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM BuildingPreferences WHERE building_id = 'building-main'
);

INSERT INTO Users (id, email, role)
SELECT 'admin-001', 'admin@lobbypack.cl', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE id = 'admin-001');

INSERT INTO Admins (user_id, admin_name, admin_password_hash)
SELECT 'admin-001', 'Paula Muñoz', 'demo-admin-password'
WHERE NOT EXISTS (SELECT 1 FROM Admins WHERE user_id = 'admin-001');

INSERT INTO Users (id, email, role)
SELECT 'concierge-demo', 'recepcion@lobbypack.cl', 'concierge'
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE id = 'concierge-demo');

INSERT INTO Concierges (user_id, concierge_name, concierge_password_hash)
SELECT 'concierge-demo', 'Marcos Silva', 'demo-concierge-password'
WHERE NOT EXISTS (SELECT 1 FROM Concierges WHERE user_id = 'concierge-demo');

INSERT INTO Users (id, email, role)
SELECT 'concierge-002', 'daniela@lobbypack.cl', 'concierge'
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE id = 'concierge-002');

INSERT INTO Concierges (user_id, concierge_name, concierge_password_hash)
SELECT 'concierge-002', 'Daniela Riquelme', 'demo-concierge-password'
WHERE NOT EXISTS (SELECT 1 FROM Concierges WHERE user_id = 'concierge-002');

INSERT INTO Users (id, email, role)
SELECT 'resident-001', 'camila@lobbypack.cl', 'resident'
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE id = 'resident-001');

INSERT INTO Residents (
  user_id,
  resident_name,
  resident_password_hash,
  user_phone_number,
  department_address
)
SELECT
  'resident-001',
  'Camila Rojas',
  'demo-resident-password',
  '+56981234567',
  'Torre A 302'
WHERE NOT EXISTS (SELECT 1 FROM Residents WHERE user_id = 'resident-001');

INSERT INTO Users (id, email, role)
SELECT 'resident-002', 'matias@lobbypack.cl', 'resident'
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE id = 'resident-002');

INSERT INTO Residents (
  user_id,
  resident_name,
  resident_password_hash,
  user_phone_number,
  department_address
)
SELECT
  'resident-002',
  'Matias Soto',
  'demo-resident-password',
  '+56984567890',
  'Torre B 511'
WHERE NOT EXISTS (SELECT 1 FROM Residents WHERE user_id = 'resident-002');

INSERT INTO Users (id, email, role)
SELECT 'resident-003', 'valentina@lobbypack.cl', 'resident'
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE id = 'resident-003');

INSERT INTO Residents (
  user_id,
  resident_name,
  resident_password_hash,
  user_phone_number,
  department_address
)
SELECT
  'resident-003',
  'Valentina Diaz',
  'demo-resident-password',
  '+56977665544',
  'Torre C 110'
WHERE NOT EXISTS (SELECT 1 FROM Residents WHERE user_id = 'resident-003');

INSERT INTO Users (id, email, role)
SELECT 'resident-004', 'diego@lobbypack.cl', 'resident'
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE id = 'resident-004');

INSERT INTO Residents (
  user_id,
  resident_name,
  resident_password_hash,
  user_phone_number,
  department_address
)
SELECT
  'resident-004',
  'Diego Perez',
  'demo-resident-password',
  '+56999887766',
  'Torre D 205'
WHERE NOT EXISTS (SELECT 1 FROM Residents WHERE user_id = 'resident-004');

INSERT INTO Users (id, email, role)
SELECT 'resident-005', 'antonia@lobbypack.cl', 'resident'
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE id = 'resident-005');

INSERT INTO Residents (
  user_id,
  resident_name,
  resident_password_hash,
  user_phone_number,
  department_address
)
SELECT
  'resident-005',
  'Antonia Mella',
  'demo-resident-password',
  '+56993456789',
  'Torre B 410'
WHERE NOT EXISTS (SELECT 1 FROM Residents WHERE user_id = 'resident-005');

INSERT INTO Users (id, email, role)
SELECT 'resident-006', 'sofia@lobbypack.cl', 'resident'
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE id = 'resident-006');

INSERT INTO Residents (
  user_id,
  resident_name,
  resident_password_hash,
  user_phone_number,
  department_address
)
SELECT
  'resident-006',
  'Sofia Araya',
  'demo-resident-password',
  '+56970011223',
  'Torre A 214'
WHERE NOT EXISTS (SELECT 1 FROM Residents WHERE user_id = 'resident-006');

INSERT INTO Businesses (id, business_name)
SELECT 'business-001', 'Chilexpress'
WHERE NOT EXISTS (SELECT 1 FROM Businesses WHERE id = 'business-001');

INSERT INTO Businesses (id, business_name)
SELECT 'business-002', 'Bluexpress'
WHERE NOT EXISTS (SELECT 1 FROM Businesses WHERE id = 'business-002');

INSERT INTO Businesses (id, business_name)
SELECT 'business-003', 'Mercado Envios'
WHERE NOT EXISTS (SELECT 1 FROM Businesses WHERE id = 'business-003');

INSERT INTO Businesses (id, business_name)
SELECT 'business-004', 'CorreosChile'
WHERE NOT EXISTS (SELECT 1 FROM Businesses WHERE id = 'business-004');

INSERT INTO Businesses (id, business_name)
SELECT 'business-005', 'Starken'
WHERE NOT EXISTS (SELECT 1 FROM Businesses WHERE id = 'business-005');

INSERT INTO Towers (id, building_id, tower_name, display_order)
SELECT 1, 'building-main', 'Torre A', 1
WHERE NOT EXISTS (SELECT 1 FROM Towers WHERE id = 1);

INSERT INTO Towers (id, building_id, tower_name, display_order)
SELECT 2, 'building-main', 'Torre B', 2
WHERE NOT EXISTS (SELECT 1 FROM Towers WHERE id = 2);

INSERT INTO Floors (tower_id, floor_number)
SELECT 1, 1 WHERE NOT EXISTS (SELECT 1 FROM Floors WHERE tower_id = 1 AND floor_number = 1);
INSERT INTO Floors (tower_id, floor_number)
SELECT 1, 2 WHERE NOT EXISTS (SELECT 1 FROM Floors WHERE tower_id = 1 AND floor_number = 2);
INSERT INTO Floors (tower_id, floor_number)
SELECT 1, 3 WHERE NOT EXISTS (SELECT 1 FROM Floors WHERE tower_id = 1 AND floor_number = 3);
INSERT INTO Floors (tower_id, floor_number)
SELECT 1, 4 WHERE NOT EXISTS (SELECT 1 FROM Floors WHERE tower_id = 1 AND floor_number = 4);
INSERT INTO Floors (tower_id, floor_number)
SELECT 1, 5 WHERE NOT EXISTS (SELECT 1 FROM Floors WHERE tower_id = 1 AND floor_number = 5);
INSERT INTO Floors (tower_id, floor_number)
SELECT 2, 1 WHERE NOT EXISTS (SELECT 1 FROM Floors WHERE tower_id = 2 AND floor_number = 1);
INSERT INTO Floors (tower_id, floor_number)
SELECT 2, 2 WHERE NOT EXISTS (SELECT 1 FROM Floors WHERE tower_id = 2 AND floor_number = 2);
INSERT INTO Floors (tower_id, floor_number)
SELECT 2, 3 WHERE NOT EXISTS (SELECT 1 FROM Floors WHERE tower_id = 2 AND floor_number = 3);
INSERT INTO Floors (tower_id, floor_number)
SELECT 2, 4 WHERE NOT EXISTS (SELECT 1 FROM Floors WHERE tower_id = 2 AND floor_number = 4);

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '101', 1
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 1
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '101');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '102', 2
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 1
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '102');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '103', 3
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 1
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '103');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '104', 4
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 1
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '104');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '201', 1
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 2
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '201');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '202', 2
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 2
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '202');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '203', 3
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 2
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '203');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '204', 4
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 2
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '204');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '301', 1
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 3
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '301');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '302', 2
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 3
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '302');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '303', 3
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 3
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '303');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '401', 1
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 4
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '401');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '402', 2
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 4
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '402');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '403', 3
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 4
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '403');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '501', 1
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 5
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '501');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '502', 2
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 5
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '502');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '503', 3
FROM Floors f
WHERE f.tower_id = 1 AND f.floor_number = 5
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '503');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '101', 1
FROM Floors f
WHERE f.tower_id = 2 AND f.floor_number = 1
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '101');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '102', 2
FROM Floors f
WHERE f.tower_id = 2 AND f.floor_number = 1
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '102');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '201', 1
FROM Floors f
WHERE f.tower_id = 2 AND f.floor_number = 2
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '201');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '202', 2
FROM Floors f
WHERE f.tower_id = 2 AND f.floor_number = 2
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '202');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '203', 3
FROM Floors f
WHERE f.tower_id = 2 AND f.floor_number = 2
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '203');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '301', 1
FROM Floors f
WHERE f.tower_id = 2 AND f.floor_number = 3
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '301');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '302', 2
FROM Floors f
WHERE f.tower_id = 2 AND f.floor_number = 3
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '302');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '303', 3
FROM Floors f
WHERE f.tower_id = 2 AND f.floor_number = 3
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '303');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '304', 4
FROM Floors f
WHERE f.tower_id = 2 AND f.floor_number = 3
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '304');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '401', 1
FROM Floors f
WHERE f.tower_id = 2 AND f.floor_number = 4
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '401');

INSERT INTO Apartments (floor_id, apartment_name, display_order)
SELECT f.id, '402', 2
FROM Floors f
WHERE f.tower_id = 2 AND f.floor_number = 4
  AND NOT EXISTS (SELECT 1 FROM Apartments a WHERE a.floor_id = f.id AND a.apartment_name = '402');

INSERT INTO Parcels (
  id,
  id_concierge,
  id_resident,
  id_business,
  withdrawal_code,
  qr_code_url,
  parcel_status,
  parcel_description,
  is_urgent,
  pending_date,
  claimed_date
)
SELECT
  'parcel-0001',
  'concierge-demo',
  'resident-001',
  'business-001',
  'REC-0001',
  'LobbyPack:parcel-0001',
  'pending',
  'Caja pequeña recepcionada en conserjería.',
  FALSE,
  '2026-03-28 09:15:00',
  NULL
WHERE NOT EXISTS (SELECT 1 FROM Parcels WHERE id = 'parcel-0001');

INSERT INTO Parcels (
  id,
  id_concierge,
  id_resident,
  id_business,
  withdrawal_code,
  qr_code_url,
  parcel_status,
  parcel_description,
  is_urgent,
  pending_date,
  claimed_date
)
SELECT
  'parcel-0002',
  'concierge-002',
  'resident-002',
  'business-002',
  'REC-0002',
  'LobbyPack:parcel-0002',
  'pending',
  'Sobre de mensajería.',
  FALSE,
  '2026-03-28 10:02:00',
  NULL
WHERE NOT EXISTS (SELECT 1 FROM Parcels WHERE id = 'parcel-0002');

INSERT INTO Parcels (
  id,
  id_concierge,
  id_resident,
  id_business,
  withdrawal_code,
  qr_code_url,
  parcel_status,
  parcel_description,
  is_urgent,
  pending_date,
  claimed_date
)
SELECT
  'parcel-0003',
  'concierge-demo',
  'resident-003',
  'business-003',
  'REC-0003',
  'LobbyPack:parcel-0003',
  'pending',
  'Pedido de supermercado.',
  TRUE,
  '2026-03-28 11:28:00',
  NULL
WHERE NOT EXISTS (SELECT 1 FROM Parcels WHERE id = 'parcel-0003');

INSERT INTO Parcels (
  id,
  id_concierge,
  id_resident,
  id_business,
  withdrawal_code,
  qr_code_url,
  parcel_status,
  parcel_description,
  is_urgent,
  pending_date,
  claimed_date
)
SELECT
  'parcel-0004',
  'admin-001',
  'resident-004',
  'business-004',
  'RET-0001',
  'LobbyPack:parcel-0004',
  'claimed',
  'Documento recepcionado.',
  FALSE,
  '2026-03-28 08:42:00',
  '2026-03-28 18:10:00'
WHERE NOT EXISTS (SELECT 1 FROM Parcels WHERE id = 'parcel-0004');

INSERT INTO Parcels (
  id,
  id_concierge,
  id_resident,
  id_business,
  withdrawal_code,
  qr_code_url,
  parcel_status,
  parcel_description,
  is_urgent,
  pending_date,
  claimed_date
)
SELECT
  'parcel-0005',
  'concierge-002',
  'resident-005',
  'business-005',
  'RET-0002',
  'LobbyPack:parcel-0005',
  'claimed',
  'Paquete mediano retirado por residente.',
  FALSE,
  '2026-03-28 09:57:00',
  '2026-03-28 14:22:00'
WHERE NOT EXISTS (SELECT 1 FROM Parcels WHERE id = 'parcel-0005');

INSERT INTO Parcels (
  id,
  id_concierge,
  id_resident,
  id_business,
  withdrawal_code,
  qr_code_url,
  parcel_status,
  parcel_description,
  is_urgent,
  pending_date,
  claimed_date
)
SELECT
  'parcel-0006',
  'concierge-demo',
  'resident-006',
  'business-001',
  'RET-0003',
  'LobbyPack:parcel-0006',
  'claimed',
  'Entrega estándar.',
  FALSE,
  '2026-03-27 17:40:00',
  '2026-03-28 11:05:00'
WHERE NOT EXISTS (SELECT 1 FROM Parcels WHERE id = 'parcel-0006');

INSERT INTO Issues (
  id,
  id_parcel,
  issue_status,
  issue_description,
  created_at
)
SELECT
  'issue-0001',
  'parcel-0001',
  'open',
  'Indica que el paquete figura como recepcionado, pero aún no estaba disponible en conserjería al momento de consultarlo.',
  '2026-03-28 13:00:00'
WHERE NOT EXISTS (SELECT 1 FROM Issues WHERE id = 'issue-0001');

INSERT INTO Issues (
  id,
  id_parcel,
  issue_status,
  issue_description,
  created_at
)
SELECT
  'issue-0002',
  'parcel-0003',
  'under_review',
  'Solicita revisión porque el número de departamento asociado al paquete no coincide con su entrega habitual.',
  '2026-03-28 14:00:00'
WHERE NOT EXISTS (SELECT 1 FROM Issues WHERE id = 'issue-0002');

INSERT INTO Issues (
  id,
  id_parcel,
  issue_status,
  issue_description,
  created_at
)
SELECT
  'issue-0003',
  'parcel-0004',
  'resolved',
  'Reporta que el paquete fue marcado como retirado, pero no fue entregado al residente correcto.',
  '2026-03-28 15:00:00'
WHERE NOT EXISTS (SELECT 1 FROM Issues WHERE id = 'issue-0003');
