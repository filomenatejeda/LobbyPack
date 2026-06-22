import { pool } from "./pool";

const schemaStatements = [
  `
    CREATE TABLE IF NOT EXISTS Users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      role ENUM('admin', 'concierge', 'resident') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS Admins (
      user_id VARCHAR(64) PRIMARY KEY,
      admin_name VARCHAR(100),
      admin_password_hash VARCHAR(255),
      FOREIGN KEY (user_id) REFERENCES Users(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS Concierges (
      user_id VARCHAR(64) PRIMARY KEY,
      concierge_name VARCHAR(100) NOT NULL,
      concierge_password_hash VARCHAR(255),
      building_id VARCHAR(64),
      FOREIGN KEY (user_id) REFERENCES Users(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS Residents (
      user_id VARCHAR(64) PRIMARY KEY,
      resident_name VARCHAR(100) NOT NULL,
      resident_password_hash VARCHAR(255),
      user_phone_number VARCHAR(12),
      department_address VARCHAR(100) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES Users(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS Businesses (
      id VARCHAR(64) PRIMARY KEY,
      business_name VARCHAR(100) NOT NULL
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS Buildings (
      id VARCHAR(64) PRIMARY KEY,
      building_name VARCHAR(100) NOT NULL,
      community_type VARCHAR(100) NOT NULL DEFAULT 'Edificio',
      contact_email VARCHAR(255) NOT NULL,
      reception_hours VARCHAR(100) NOT NULL,
      address_line VARCHAR(255) NOT NULL,
      access_password VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS BuildingPreferences (
      building_id VARCHAR(64) PRIMARY KEY,
      package_notifications BOOLEAN DEFAULT TRUE,
      daily_summary BOOLEAN DEFAULT TRUE,
      qr_access BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (building_id) REFERENCES Buildings(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
  `
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
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS Towers (
      id BIGINT PRIMARY KEY,
      building_id VARCHAR(64) NOT NULL,
      tower_name VARCHAR(100) NOT NULL,
      display_order INT NOT NULL,
      FOREIGN KEY (building_id) REFERENCES Buildings(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS Floors (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      tower_id BIGINT NOT NULL,
      floor_number INT NOT NULL,
      UNIQUE KEY unique_tower_floor (tower_id, floor_number),
      FOREIGN KEY (tower_id) REFERENCES Towers(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS Apartments (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      floor_id BIGINT NOT NULL,
      apartment_name VARCHAR(50) NOT NULL,
      display_order INT NOT NULL,
      UNIQUE KEY unique_floor_apartment (floor_id, apartment_name),
      FOREIGN KEY (floor_id) REFERENCES Floors(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS ResidentAccountSecurity (
      user_id VARCHAR(64) PRIMARY KEY,
      email_verification_code_hash VARCHAR(64),
      email_verification_expires_at TIMESTAMP NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      totp_secret VARCHAR(64),
      totp_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS Parcels (
      id VARCHAR(64) PRIMARY KEY,
      id_concierge VARCHAR(64) NOT NULL,
      id_resident VARCHAR(64) NOT NULL,
      id_business VARCHAR(64) NOT NULL,
      delivery_department_address VARCHAR(100),
      withdrawal_code VARCHAR(64),
      qr_code_url TEXT,
      qr_token VARCHAR(64),
      parcel_status ENUM('pending', 'claimed') NOT NULL DEFAULT 'pending',
      parcel_description TEXT,
      is_urgent BOOLEAN DEFAULT FALSE,
      pending_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resident_claim_confirmed_at TIMESTAMP NULL,
      resident_claimed_by_user_id VARCHAR(64) NULL,
      claimed_date TIMESTAMP NULL,
      claimed_by_user_id VARCHAR(64) NULL,
      FOREIGN KEY (id_concierge) REFERENCES Users(id),
      FOREIGN KEY (id_resident) REFERENCES Users(id),
      FOREIGN KEY (resident_claimed_by_user_id) REFERENCES Users(id),
      FOREIGN KEY (id_business) REFERENCES Businesses(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS Issues (
      id VARCHAR(64) PRIMARY KEY,
      id_parcel VARCHAR(64) NOT NULL,
      created_by_user_id VARCHAR(64) NULL,
      issue_status ENUM('open', 'under_review', 'resolved') NOT NULL DEFAULT 'open',
      issue_description TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_parcel) REFERENCES Parcels(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES Users(id) ON DELETE SET NULL
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `,
];

export async function ensureDatabaseSchema() {
  for (const statement of schemaStatements) {
    await pool.query(statement);
  }
}
