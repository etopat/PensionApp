<?php
/**
 * ============================================================
 * logout.php (Enhanced with Comprehensive User Logging)
 * ------------------------------------------------------------
 * PURPOSE:
 *   - Handles user logout with complete session cleanup
 *   - Logs logout activity with duration and type
 *   - Supports different logout types (user_initiated, session_expiry, device_conflict)
 *   - Updates login records with logout time and duration
 * ============================================================
 */

session_start();
require_once __DIR__ . '/../config.php';

// Determine logout type from request or default to user initiated
$logoutType = $_POST['logout_type'] ?? 'user_initiated';
$logoutReason = $_POST['logout_reason'] ?? 'User clicked logout button';

// Prepare user info for logging
$userId = $_SESSION['userId'] ?? 'unknown';
$userName = $_SESSION['userName'] ?? 'Unknown User';
$userRole = $_SESSION['userRole'] ?? 'guest';
$sessionId = $_SESSION['session_id'] ?? session_id();
$loginLogId = $_SESSION['login_log_id'] ?? null;

// Get device and location info for logging
$ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
$deviceType = detectDeviceType($userAgent);
$location = getLocationFromIP($ipAddress);

// Map logout type to activity type for logging
$activityTypes = [
    'user_initiated' => 'logout',
    'session_expiry' => 'session_expiry',
    'device_conflict' => 'device_conflict',
    'auto_logout' => 'auto_logout'
];

$activityType = $activityTypes[$logoutType] ?? 'logout';

// Calculate session duration if we have a login log
$duration = 0;
if ($loginLogId) {
    try {
        $stmt = $conn->prepare("SELECT login_time FROM tb_user_logs WHERE log_id = ?");
        $stmt->bind_param("i", $loginLogId);
        $stmt->execute();
        $result = $stmt->get_result();
        $loginRecord = $result->fetch_assoc();
        $stmt->close();
        
        if ($loginRecord) {
            $loginTime = strtotime($loginRecord['login_time']);
            $logoutTime = time();
            $duration = $logoutTime - $loginTime;
            
            // Update the login record with logout time and duration
            $updateStmt = $conn->prepare("
                UPDATE tb_user_logs 
                SET logout_time = NOW(), duration_seconds = ? 
                WHERE log_id = ?
            ");
            $updateStmt->bind_param("ii", $duration, $loginLogId);
            $updateStmt->execute();
            $updateStmt->close();
        }
    } catch (Exception $e) {
        error_log("Failed to update login record with logout time: " . $e->getMessage());
    }
}

// 🔥 LOG THE LOGOUT ACTIVITY
logUserActivity($conn, [
    'user_id' => $userId,
    'user_name' => $userName,
    'user_role' => $userRole,
    'activity_type' => $activityType,
    'ip_address' => $ipAddress,
    'user_agent' => $userAgent,
    'device_type' => $deviceType,
    'location' => $location,
    'session_id' => $sessionId,
    'details' => "Logout reason: $logoutReason | Session duration: " . formatDuration($duration)
]);

// Mark session as inactive in database
if (isset($_SESSION['session_id'])) {
    $stmt = $conn->prepare("UPDATE tb_user_sessions SET is_active = 0 WHERE session_id = ?");
    $stmt->bind_param("s", $_SESSION['session_id']);
    $stmt->execute();
    $stmt->close();
}

// Clear session data
$_SESSION = [];

// Destroy session cookie if used
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Destroy the session
session_destroy();

// Return JSON response (client handles redirection)
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'message' => 'You have been successfully logged out.',
    'logout_type' => $logoutType,
    'session_duration' => $duration,
    'logged' => true
]);

// ============================================================
// SUPPORT FUNCTIONS
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
 */
function getLocationFromIP($ip) {
    if ($ip === '127.0.0.1' || $ip === '::1') {
        return 'Localhost';
    }
    return "IP: $ip";
}

/**
 * Format duration in seconds to human readable format
 */
function formatDuration($seconds) {
    if ($seconds < 60) {
        return "$seconds seconds";
    } elseif ($seconds < 3600) {
        $minutes = floor($seconds / 60);
        return "$minutes minutes";
    } else {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        return "$hours hours, $minutes minutes";
    }
}

exit;
?>