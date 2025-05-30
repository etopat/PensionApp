
-- Table 1: users
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'clerk', 'oc_pen', 'writeup_officer', 'assessor', 'auditor', 'approver') NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: staff_due_for_retirement
CREATE TABLE staff_due_for_retirement (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_number VARCHAR(50) NOT NULL UNIQUE,
    surname VARCHAR(100),
    other_names VARCHAR(100),
    gender ENUM('male', 'female'),
    living_status ENUM('alive', 'deceased'),
    national_id VARCHAR(50),
    last_duty_station VARCHAR(100),
    retirement_type ENUM('Mandatory', 'Discharge (CBE)', 'Discharge (UBE)', 'Discharge (MG)', 'Discharge (AOR)', 'Early Retirement', 'Death', 'Contract'),
    birth_date DATE,
    enlistment_date DATE,
    retirement_date DATE,
    length_of_service INT,
    last_monthly_salary DECIMAL(12, 2),
    monthly_pension_estimate DECIMAL(12, 2),
    gratuity_estimate DECIMAL(12, 2),
    full_pension_estimate DECIMAL(12, 2),
    address TEXT,
    contact VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: pensioners
CREATE TABLE pensioners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_number VARCHAR(50) NOT NULL UNIQUE,
    surname VARCHAR(100),
    other_names VARCHAR(100),
    retirement_type VARCHAR(50),
    enlistment_date DATE,
    retirement_date DATE,
    last_monthly_salary DECIMAL(12, 2),
    national_id VARCHAR(50),
    tax_id VARCHAR(50),
    address TEXT,
    contact VARCHAR(50),
    district_of_residence VARCHAR(100),
    living_status ENUM('alive', 'deceased'),
    computer_no VARCHAR(50),
    supplier_no VARCHAR(50),
    date_on_15years DATE,
    period_to_15years INT,
    period_after_15years INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 4: applications
CREATE TABLE applications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pensioner_id INT,
    application_type ENUM('Pension', 'Gratuity', 'Pension Arrears', 'Gratuity Arrears', 'Full Pension', 'Underpayment Claim'),
    submission_date DATE,
    status ENUM('pending', 'verified', 'approved', 'rejected'),
    notes TEXT,
    FOREIGN KEY (pensioner_id) REFERENCES pensioners(id)
);

-- Table 5: documents
CREATE TABLE documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    application_id INT,
    document_type VARCHAR(100),
    file_path TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id)
);

-- Table 6: tasks
CREATE TABLE tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    application_id INT,
    assigned_to INT,
    assigned_by INT,
    role_at_stage VARCHAR(50),
    task_status ENUM('pending', 'completed', 'deferred', 'closed'),
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Table 7: messages
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT,
    recipient_id INT,
    subject VARCHAR(150),
    body TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id)
);

-- Table 8: pension_file_registry
CREATE TABLE pension_file_registry (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pensioner_id INT,
    box_number INT,
    shelf_location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pensioner_id) REFERENCES pensioners(id)
);

-- Table 9: file_movements
CREATE TABLE file_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pensioner_id INT,
    movement_type ENUM('Incoming', 'Outgoing'),
    from_office VARCHAR(100),
    to_office VARCHAR(100),
    purpose TEXT,
    delivered_by VARCHAR(100),
    date_moved DATE,
    returned_by VARCHAR(100),
    date_returned DATE,
    FOREIGN KEY (pensioner_id) REFERENCES pensioners(id)
);

-- Table 10: reports
CREATE TABLE reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    report_type VARCHAR(100),
    generated_by INT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    report_data TEXT,
    FOREIGN KEY (generated_by) REFERENCES users(id)
);

-- Table 11: alerts
CREATE TABLE alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    alert_type VARCHAR(100),
    message TEXT,
    seen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table 12: life_certificates
CREATE TABLE life_certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pensioner_id INT,
    year YEAR,
    submitted_on DATE,
    verified_by INT,
    FOREIGN KEY (pensioner_id) REFERENCES pensioners(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Table 13: payroll_records
CREATE TABLE payroll_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    month YEAR,
    record_type ENUM('Pension', 'Gratuity', 'Arrears', 'Suspended'),
    file_path TEXT,
    uploaded_by INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
