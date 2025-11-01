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

// Check if user session exists
if (!isset($_SESSION['userId']) || !isset($_SESSION['userRole'])) {
    echo json_encode([
        'active' => false,
        'message' => 'No active session found'
    ]);
    exit;
}

// If last_activity is not yet set, initialize it (first check after login)
if (!isset($_SESSION['last_activity'])) {
    $_SESSION['last_activity'] = time();
}

// Check for timeout
if (time() - $_SESSION['last_activity'] > $timeout) {
    session_unset();
    session_destroy();
    echo json_encode([
        'active' => false,
        'message' => 'Session expired due to inactivity'
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
