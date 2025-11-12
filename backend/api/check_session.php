<?php
/**
 * ============================================================
 * check_session.php (Enhanced with Device Validation)
 * ------------------------------------------------------------
 * Purpose:
 *   - Verifies if the session is active and not expired.
 *   - Returns user details (ID, Name, Role) if active.
 *   - Supports inactivity timeout.
 *   - Validates device session ownership
 *   - Detects and reports device conflicts instantly
 *   - Prevents repeated device conflict messages for different users
 * ============================================================
 */

session_start();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
require_once __DIR__ . '/../config.php';

// Session timeout in seconds
$timeout = 1800; // 1800 = 30 mins

// Check if user session exists
if (!isset($_SESSION['userId']) || !isset($_SESSION['userRole'])) {
    echo json_encode([
        'active' => false,
        'message' => 'No active session found'
    ]);
    exit;
}

// ------------------------------------------------------------
// Validate session ownership in database
// ------------------------------------------------------------
if (isset($_SESSION['session_id'])) {
    $stmt = $conn->prepare("
        SELECT is_active, device_id, user_id 
        FROM tb_user_sessions 
        WHERE session_id = ? AND user_id = ?
    ");
    $stmt->bind_param("ss", $_SESSION['session_id'], $_SESSION['userId']);
    $stmt->execute();
    $result = $stmt->get_result();
    $sessionData = $result->fetch_assoc();
    $stmt->close();
    
    // Check if session is marked as inactive (logged out from another device)
    if (!$sessionData || $sessionData['is_active'] == 0) {
        // 🔥 CRITICAL FIX: Completely destroy PHP session for this user
        session_unset();
        session_destroy();
        
        // 🔥 Also clear the session cookie immediately
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        
        echo json_encode([
            'active' => false,
            'message' => 'Logged in from another device',
            'terminated' => true,
            'reason' => 'device_conflict',
            'session_cleared' => true
        ]);
        exit;
    }
    
    // Update last activity in database
    $updateStmt = $conn->prepare("
        UPDATE tb_user_sessions 
        SET last_activity = CURRENT_TIMESTAMP 
        WHERE session_id = ?
    ");
    $updateStmt->bind_param("s", $_SESSION['session_id']);
    $updateStmt->execute();
    $updateStmt->close();
}

// If last_activity is not yet set, initialize it (first check after login)
if (!isset($_SESSION['last_activity'])) {
    $_SESSION['last_activity'] = time();
}

// Check for timeout
if (time() - $_SESSION['last_activity'] > $timeout) {
    // Mark session as inactive in database
    if (isset($_SESSION['session_id'])) {
        $stmt = $conn->prepare("UPDATE tb_user_sessions SET is_active = 0 WHERE session_id = ?");
        $stmt->bind_param("s", $_SESSION['session_id']);
        $stmt->execute();
        $stmt->close();
    }
    
    // 🔥 CRITICAL FIX: Completely destroy PHP session
    session_unset();
    session_destroy();
    
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    echo json_encode([
        'active' => false,
        'message' => 'Session expired due to inactivity',
        'reason' => 'inactivity',
        'session_cleared' => true
    ]);
    exit;
}

// Update timestamp
$_SESSION['last_activity'] = time();

echo json_encode([
    'active' => true,
    'userId' => $_SESSION['userId'],
    'userName' => $_SESSION['userName'],
    'userRole' => $_SESSION['userRole']
]);
?>