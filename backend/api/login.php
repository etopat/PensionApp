<?php
/**
 * ============================================================
 * LOGIN API
 * ============================================================
 * Authenticates users using either Email OR Phone Number.
 * - Uses the correct userId (varchar) from your tb_users table
 * - Single device login enforcement
 * ============================================================
 */

session_start();

// Clear any existing session if this is a login attempt
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Clear previous session data to prevent conflicts
    session_unset();
    
    // Generate new session ID for fresh login
    session_regenerate_id(true);
}

header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

// ------------------------------------------------------------
// 1️⃣ Validate Request Method
// ------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

// ------------------------------------------------------------
// 2️⃣ Get and Validate Input
// ------------------------------------------------------------
$username = trim($_POST['email'] ?? ''); // may be email or phone number
$password = trim($_POST['password'] ?? '');

if ($username === '' || $password === '') {
    echo json_encode(['success' => false, 'message' => 'Please enter your email/phone and password']);
    exit;
}

// ------------------------------------------------------------
// 3️⃣ Determine if Input is Email or Phone Number
// ------------------------------------------------------------
$isEmail = filter_var($username, FILTER_VALIDATE_EMAIL);
$isPhone = preg_match('/^\+[1-9][0-9]{7,14}$/', $username); // E.164 format e.g., +256700123456

if (!$isEmail && !$isPhone) {
    echo json_encode(['success' => false, 'message' => 'Enter a valid email or phone number (e.g., +256700123456)']);
    exit;
}

// ------------------------------------------------------------
// 4️⃣ Prepare SQL Query Based on Input Type
// ------------------------------------------------------------
try {
    if ($isEmail) {
        $stmt = $conn->prepare("
            SELECT userId, userName, userRole, userPassword, userPhoto, phoneNo 
            FROM tb_users 
            WHERE userEmail = ?
        ");
    } else {
        $stmt = $conn->prepare("
            SELECT userId, userName, userRole, userPassword, userPhoto, phoneNo 
            FROM tb_users 
            WHERE phoneNo = ?
        ");
    }

    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }

    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    // ------------------------------------------------------------
    // 5️⃣ Validate Credentials
    // ------------------------------------------------------------
    if ($row = $result->fetch_assoc()) {
        if (password_verify($password, $row['userPassword'])) {
            $userId = $row['userId']; // This is the VARCHAR userId
            
            // ------------------------------------------------------------
            // 6️⃣ SINGLE DEVICE LOGIN: Check for existing active sessions
            // ------------------------------------------------------------
            $deviceId = generateDeviceId();
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
            $sessionId = session_id();
            
            // Check if user has other active sessions
            $checkStmt = $conn->prepare("
                SELECT session_id, login_time 
                FROM tb_user_sessions 
                WHERE user_id = ? AND is_active = 1 
                ORDER BY last_activity DESC 
                LIMIT 1
            ");
            
            if (!$checkStmt) {
                throw new Exception("Failed to prepare check statement: " . $conn->error);
            }
            
            $checkStmt->bind_param("s", $userId); // Changed to "s" for string
            $checkStmt->execute();
            $existingSession = $checkStmt->get_result()->fetch_assoc();
            $checkStmt->close();
            
            $hasExistingSession = !empty($existingSession);
            $existingSessionId = $existingSession['session_id'] ?? null;
            
            // ------------------------------------------------------------
            // 7️⃣ Create new session in database
            // ------------------------------------------------------------
            $insertStmt = $conn->prepare("
                INSERT INTO tb_user_sessions (session_id, user_id, device_id, user_agent, ip_address, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
                ON DUPLICATE KEY UPDATE 
                    device_id = VALUES(device_id),
                    user_agent = VALUES(user_agent),
                    ip_address = VALUES(ip_address),
                    is_active = 1,
                    last_activity = CURRENT_TIMESTAMP
            ");
            
            if (!$insertStmt) {
                throw new Exception("Failed to prepare insert statement: " . $conn->error);
            }
            
            $insertStmt->bind_param("sssss", $sessionId, $userId, $deviceId, $userAgent, $ipAddress);
            $insertSuccess = $insertStmt->execute();
            
            if (!$insertSuccess) {
                throw new Exception("Failed to insert session: " . $conn->error);
            }
            
            $insertStmt->close();
            
            // ------------------------------------------------------------
            // 8️⃣ Create secure PHP session
            // ------------------------------------------------------------
            $_SESSION['userId'] = $row['userId'];
            $_SESSION['userName'] = $row['userName'];
            $_SESSION['userRole'] = $row['userRole'];
            $_SESSION['userPhoto'] = $row['userPhoto'] ?: '../uploads/profiles/default-user.png';
            $_SESSION['phoneNo'] = $row['phoneNo'];
            $_SESSION['last_activity'] = time();
            $_SESSION['session_id'] = $sessionId;
            $_SESSION['device_id'] = $deviceId;
            
            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'userId' => $row['userId'],
                'userName' => $row['userName'],
                'userRole' => $row['userRole'],
                'userPhoto' => $row['userPhoto'] ?: '../uploads/profiles/default-user.png',
                'phoneNo' => $row['phoneNo'],
                'hasExistingSession' => $hasExistingSession,
                'existingSessionId' => $existingSessionId
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Incorrect password']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'No user found with that email or phone number']);
    }
} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} finally {
    if (isset($stmt) && $stmt instanceof mysqli_stmt) {
        $stmt->close();
    }
    $conn->close();
}

/**
 * Generate a unique device identifier
 */
function generateDeviceId() {
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $language = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
    
    $deviceString = $userAgent . $ip . $accept . $language;
    return hash('sha256', $deviceString);
}
?>