CREATE TABLE IF NOT EXISTS Users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role ENUM('admin', 'concierge', 'resident') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Admins (
  user_id VARCHAR(64) PRIMARY KEY,
  admin_name VARCHAR(100),
  admin_password_hash VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Concierges (
  user_id VARCHAR(64) PRIMARY KEY,
  concierge_name VARCHAR(100),
  concierge_password_hash VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Residents (
  user_id VARCHAR(64) PRIMARY KEY,
  resident_name VARCHAR(100),
  resident_password_hash VARCHAR(255),
  user_phone_number VARCHAR(12),
  department_address VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Businesses (
  id VARCHAR(64) PRIMARY KEY,
  business_name VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS Parcels (
  id VARCHAR(64) PRIMARY KEY,
  id_concierge VARCHAR(64),
  id_resident VARCHAR(64),
  id_business VARCHAR(64),
  withdrawal_code VARCHAR(64),
  qr_code_url TEXT,
  parcel_status ENUM('pending', 'claimed'),
  parcel_description TEXT,
  is_urgent BOOLEAN,
  pending_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed_date TIMESTAMP,
  FOREIGN KEY (id_concierge) REFERENCES Users(id),
  FOREIGN KEY (id_resident) REFERENCES Users(id),
  FOREIGN KEY (id_business) REFERENCES Businesses(id)
);

CREATE TABLE IF NOT EXISTS Issues (
  id VARCHAR(64) PRIMARY KEY,
  id_parcel VARCHAR(64),
  issue_status ENUM('open','under_review', 'resolved'),
  issue_description TEXT,
  FOREIGN KEY (id_parcel) REFERENCES Parcels(id)
);