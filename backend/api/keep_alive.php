<?php
/**
 * ============================================================
 * keep_alive.php
 * ------------------------------------------------------------
 * Purpose:
 *   - Silently refreshes the user's session timestamp during
 *     in-page activity events (click, scroll, input, etc.).
 *   - Prevents PHP session timeout while the user is active.
 *   - Ensures consistent behavior with check_session.php.
 * ============================================================
 */

session_start();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// ------------------------------------------------------------
// 1️⃣ Ensure session exists before updating
// ------------------------------------------------------------
if (!isset($_SESSION['userId']) || !isset($_SESSION['userRole'])) {
    echo json_encode([
        'success' => false,
        'message' => 'No active session found'
    ]);
    exit;
}

// ------------------------------------------------------------
// 2️⃣ Update the session timestamp
// ------------------------------------------------------------
$_SESSION['last_activity'] = time();

// ------------------------------------------------------------
// 3️⃣ Respond success
// ------------------------------------------------------------
echo json_encode([
    'success' => true,
    'message' => 'Session refreshed successfully',
    'userId' => $_SESSION['userId'],
    'timestamp' => $_SESSION['last_activity']
]);
?>