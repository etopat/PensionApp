

-- Table: tb_users
CREATE TABLE tb_users (
    userId INT PRIMARY KEY AUTO_INCREMENT,
    userTitle VARCHAR(20),
    userName VARCHAR(100),
    userRole ENUM('admin', 'clerk', 'oc_pen', 'write_up_officer', 'file_creator', 'data_entry', 'assessor', 'auditor', 'approver'),
    userEmail VARCHAR(100) UNIQUE,
    userPassword VARCHAR(255),
    userPhoto VARCHAR(255),
    timeStamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    other TEXT
);

-- Table: tb_staffDue
CREATE TABLE tb_staffDue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    regNo VARCHAR(50) UNIQUE,
    computerNo VARCHAR(50),
    title VARCHAR(20),
    sName VARCHAR(100),
    fName VARCHAR(100),
    gender ENUM('Male', 'Female'),
    prisonUnit VARCHAR(100),
    contact VARCHAR(50),
    birthDate DATE,
    enlistmentDate DATE,
    retirementDate DATE,
    financialYear YEAR,
    retirementType VARCHAR(50),
    lastPay DECIMAL(10, 2),
    lengthOfService INT,
    lastMonthlyPay DECIMAL(10, 2),
    reducedPension DECIMAL(10, 2),
    fullPension DECIMAL(10, 2),
    gratuity DECIMAL(10, 2),
    appnStatus ENUM('submitted', 'not submitted')
);

-- Table: tb_appnSubmissions
CREATE TABLE tb_appnSubmissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    regNo VARCHAR(50),
    title VARCHAR(20),
    sName VARCHAR(100),
    fName VARCHAR(100),
    appnType ENUM('Pension', 'Gratuity', 'Arrears', 'Full Pension', 'Underpayment'),
    contact VARCHAR(50),
    address TEXT,
    retirementDate DATE,
    retirementType VARCHAR(50),
    submissionDate DATE,
    comment TEXT,
    FOREIGN KEY (regNo) REFERENCES tb_staffDue(regNo)
);

-- Table: tb_appnStatus
CREATE TABLE tb_appnStatus (
    id INT PRIMARY KEY AUTO_INCREMENT,
    regNo VARCHAR(50) UNIQUE,
    computerNo VARCHAR(50),
    verification VARCHAR(50),
    writeUp VARCHAR(50),
    fileCreation VARCHAR(50),
    entrantAllocation VARCHAR(50),
    dataCapture VARCHAR(50),
    assessment VARCHAR(50),
    audit VARCHAR(50),
    approval VARCHAR(50),
    payrollAccess VARCHAR(50),
    other TEXT,
    timeStamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: tb_claimStatus
CREATE TABLE tb_claimStatus (
    id INT PRIMARY KEY AUTO_INCREMENT,
    regNo VARCHAR(50),
    computerNo VARCHAR(50),
    supplierNo VARCHAR(50),
    appnType VARCHAR(50),
    verificationDate DATE,
    appnStatus VARCHAR(50),
    comment TEXT
);

-- Table: tb_fileRegistry
CREATE TABLE tb_fileRegistry (
    id INT PRIMARY KEY AUTO_INCREMENT,
    computerNo VARCHAR(50) UNIQUE,
    supplierNo VARCHAR(50),
    regNo VARCHAR(50) UNIQUE,
    title VARCHAR(20),
    sName VARCHAR(100),
    fName VARCHAR(100),
    gender ENUM('Male', 'Female'),
    livingStatus ENUM('Alive', 'Deceased'),
    lifeCertificate BOOLEAN,
    boxNo VARCHAR(50),
    birthDate DATE,
    enlistmentDate DATE,
    retirementDate DATE,
    retirementType VARCHAR(50),
    TIN VARCHAR(50),
    NIN VARCHAR(50),
    address TEXT,
    payrollStatus VARCHAR(50),
    payType VARCHAR(50),
    dateOn15yrs DATE,
    periodTo15yrs INT,
    periodFrom15yrs INT,
    timeStamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    other TEXT
);

-- Table: tb_lifeCertificates
CREATE TABLE tb_lifeCertificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    computerNo VARCHAR(50),
    regNo VARCHAR(50),
    sName VARCHAR(100),
    fName VARCHAR(100),
    nextOfKin VARCHAR(100),
    nokContact VARCHAR(50),
    timeStamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: tb_pensionPayroll
CREATE TABLE tb_pensionPayroll (
    id INT UNIQUE,
    supplierNo VARCHAR(50) PRIMARY KEY,
    amount DECIMAL(10, 2),
    status VARCHAR(50)
);

-- Table: tb_tasks
CREATE TABLE tb_tasks (
    taskId INT PRIMARY KEY AUTO_INCREMENT,
    createdBy INT,
    sentTo INT,
    details TEXT,
    other TEXT,
    timeStamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES tb_users(userId),
    FOREIGN KEY (sentTo) REFERENCES tb_users(userId)
);

-- Table: tb_messages
CREATE TABLE tb_messages (
    messageId INT PRIMARY KEY AUTO_INCREMENT,
    senderId INT,
    receiverId INT,
    subject VARCHAR(255),
    body TEXT,
    status ENUM('read', 'unread') DEFAULT 'unread',
    sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (senderId) REFERENCES tb_users(userId),
    FOREIGN KEY (receiverId) REFERENCES tb_users(userId)
);
