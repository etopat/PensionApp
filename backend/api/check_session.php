<?php
/**
 * ============================================================
 * check_session.php
 * ------------------------------------------------------------
 * Purpose:
 *   - Verifies if the session is active and not expired.
 *   - Returns user details (ID, Name, Role) if active.
 *   - Supports inactivity timeout.
 * ============================================================
 */

session_start();
header('Content-Type: application/json');

// Session timeout in seconds (e.g., 30 minutes)
$timeout = 1800; // 1800 = 30 mins

if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout)) {
    // Session expired due to inactivity
    session_unset();
    session_destroy();
    echo json_encode([
        'active' => false,
        'message' => 'Session expired due to inactivity'
    ]);
    exit;
}

if (isset($_SESSION['userId']) && isset($_SESSION['userRole'])) {
    // Session is active → Update last activity timestamp
    $_SESSION['last_activity'] = time();

    echo json_encode([
        'active' => true,
        'userId' => $_SESSION['userId'],
        'userName' => $_SESSION['userName'],
        'userRole' => $_SESSION['userRole']
    ]);
} else {
    // No valid session
    echo json_encode([
        'active' => false,
        'message' => 'No active session found'
    ]);
}
?>
