<?php
/**
 * ============================================================
 * LOGIN API (Enhanced with Comprehensive User Logging)
 * ============================================================
 * Authenticates users using either Email OR Phone Number.
 * - Uses the correct userId (varchar) from your tb_users table
 * - Single device login enforcement
 * - SMART detection: Only considers RECENTLY active sessions as "existing"
 * - Complete cleanup of expired sessions during login
 * - COMPREHENSIVE USER ACTIVITY LOGGING
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

// Session timeout in seconds (for smart session detection)
$timeout = 1800;

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
            
            // 🔥 ENHANCED: Clean up expired sessions before checking for existing ones
            cleanupExpiredSessionsBeforeLogin($conn, $timeout);
            
            // ------------------------------------------------------------
            // 6️⃣ SMART SINGLE DEVICE LOGIN: Check for RECENTLY active sessions only
            // ------------------------------------------------------------
            $deviceId = generateDeviceId();
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
            $sessionId = session_id();
            $deviceType = detectDeviceType($userAgent);
            $location = getLocationFromIP($ipAddress);
            
            // 🔥 ENHANCED: Only consider sessions active within the timeout period
            $activeTimeThreshold = date('Y-m-d H:i:s', time() - $timeout);
            
            $checkStmt = $conn->prepare("
                SELECT session_id, login_time, last_activity 
                FROM tb_user_sessions 
                WHERE user_id = ? 
                AND is_active = 1 
                AND last_activity >= ?
                ORDER BY last_activity DESC 
                LIMIT 1
            ");
            
            if (!$checkStmt) {
                throw new Exception("Failed to prepare check statement: " . $conn->error);
            }
            
            $checkStmt->bind_param("ss", $userId, $activeTimeThreshold);
            $checkStmt->execute();
            $existingSession = $checkStmt->get_result()->fetch_assoc();
            $checkStmt->close();
            
            // 🔥 ENHANCED: Only show conflict if there's a RECENT active session
            $hasExistingSession = !empty($existingSession);
            $existingSessionId = $existingSession['session_id'] ?? null;
            
            // Log for debugging
            if ($hasExistingSession) {
                error_log("🔍 Login: Found recent active session for user $userId - " . $existingSessionId);
            } else {
                error_log("🔍 Login: No recent active sessions found for user $userId");
            }
            
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
            
            // 🔥 NEW: LOG SUCCESSFUL LOGIN ACTIVITY
            logUserActivity($conn, [
                'user_id' => $userId,
                'user_name' => $row['userName'],
                'user_role' => $row['userRole'],
                'activity_type' => 'login',
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'device_type' => $deviceType,
                'location' => $location,
                'session_id' => $sessionId,
                'details' => 'Successful login via ' . ($isEmail ? 'email' : 'phone')
            ]);
            
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
            $_SESSION['login_log_id'] = getLastLoginLogId($conn, $sessionId); // Store for logout logging
            
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
            // 🔥 NEW: LOG FAILED LOGIN ATTEMPT
            logUserActivity($conn, [
                'user_id' => 'unknown',
                'user_name' => 'Unknown User',
                'user_role' => 'guest',
                'activity_type' => 'login',
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
                'device_type' => detectDeviceType($_SERVER['HTTP_USER_AGENT'] ?? ''),
                'location' => getLocationFromIP($_SERVER['REMOTE_ADDR'] ?? ''),
                'session_id' => session_id(),
                'details' => 'Failed login attempt for username: ' . $username
            ]);
            
            echo json_encode(['success' => false, 'message' => 'Incorrect password']);
        }
    } else {
        // 🔥 NEW: LOG ATTEMPT WITH NON-EXISTENT USERNAME
        logUserActivity($conn, [
            'user_id' => 'unknown',
            'user_name' => 'Unknown User',
            'user_role' => 'guest',
            'activity_type' => 'login',
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
            'device_type' => detectDeviceType($_SERVER['HTTP_USER_AGENT'] ?? ''),
            'location' => getLocationFromIP($_SERVER['REMOTE_ADDR'] ?? ''),
            'session_id' => session_id(),
            'details' => 'Attempted login with non-existent username: ' . $username
        ]);
        
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

// ============================================================
// 🔥 NEW: COMPREHENSIVE LOGGING FUNCTIONS
// ============================================================

/**
 * Log user activity to tb_user_logs table
 */
function logUserActivity($conn, $logData) {
    try {
        $stmt = $conn->prepare("
            INSERT INTO tb_user_logs 
            (user_id, user_name, user_role, activity_type, ip_address, user_agent, device_type, location, session_id, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->bind_param(
            "ssssssssss",
            $logData['user_id'],
            $logData['user_name'],
            $logData['user_role'],
            $logData['activity_type'],
            $logData['ip_address'],
            $logData['user_agent'],
            $logData['device_type'],
            $logData['location'],
            $logData['session_id'],
            $logData['details']
        );
        
        $stmt->execute();
        $stmt->close();
        
        return true;
    } catch (Exception $e) {
        error_log("Failed to log user activity: " . $e->getMessage());
        return false;
    }
}

/**
 * Detect device type from user agent string
 */
function detectDeviceType($userAgent) {
    $userAgent = strtolower($userAgent);
    
    if (strpos($userAgent, 'mobile') !== false) {
        return 'Mobile';
    } elseif (strpos($userAgent, 'tablet') !== false) {
        return 'Tablet';
    } elseif (strpos($userAgent, 'android') !== false) {
        return 'Android Mobile';
    } elseif (strpos($userAgent, 'iphone') !== false) {
        return 'iPhone';
    } elseif (strpos($userAgent, 'ipad') !== false) {
        return 'iPad';
    } elseif (strpos($userAgent, 'windows') !== false) {
        return 'Windows PC';
    } elseif (strpos($userAgent, 'macintosh') !== false) {
        return 'Macintosh';
    } elseif (strpos($userAgent, 'linux') !== false) {
        return 'Linux PC';
    } else {
        return 'Unknown Device';
    }
}

/**
 * Get location from IP address (basic implementation)
 * Note: For production, consider using a proper IP geolocation service
 */
function getLocationFromIP($ip) {
    // Simple implementation - in production, use a service like ipinfo.io or MaxMind
    if ($ip === '127.0.0.1' || $ip === '::1') {
        return 'Localhost';
    }
    
    // You can integrate with a free service like ipapi.co
    // For now, returning the IP itself as location
    return "IP: $ip";
    
    /*
    // Example with ipapi.co (requires API key for production)
    try {
        $response = file_get_contents("http://ipapi.co/$ip/json/");
        $data = json_decode($response, true);
        return $data['city'] . ', ' . $data['country_name'] ?? 'Unknown Location';
    } catch (Exception $e) {
        return "IP: $ip";
    }
    */
}

/**
 * Get the last login log ID for a session (to link logout with login)
 */
function getLastLoginLogId($conn, $sessionId) {
    try {
        $stmt = $conn->prepare("
            SELECT log_id FROM tb_user_logs 
            WHERE session_id = ? AND activity_type = 'login' 
            ORDER BY created_at DESC LIMIT 1
        ");
        $stmt->bind_param("s", $sessionId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $stmt->close();
        
        return $row['log_id'] ?? null;
    } catch (Exception $e) {
        error_log("Failed to get last login log ID: " . $e->getMessage());
        return null;
    }
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

/**
 * Clean up expired sessions before login check
 * This ensures we only check for truly active sessions
 */
function cleanupExpiredSessionsBeforeLogin($conn, $timeout) {
    $expiryTime = date('Y-m-d H:i:s', time() - $timeout);
    
    $stmt = $conn->prepare("
        DELETE FROM tb_user_sessions 
        WHERE last_activity < ? OR is_active = 0
    ");
    $stmt->bind_param("s", $expiryTime);
    $stmt->execute();
    $affectedRows = $stmt->affected_rows;
    $stmt->close();
    
    if ($affectedRows > 0) {
        error_log("🧹 Pre-login cleanup: Removed $affectedRows expired sessions");
    }
}
?>