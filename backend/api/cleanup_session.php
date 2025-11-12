<?php
/**
 * ============================================================
 * cleanup_session.php
 * ------------------------------------------------------------
 * Purpose: Forcefully clears PHP session and cookies
 * Used when device conflicts or session expiry occurs
 * ============================================================
 */

session_start();

// Completely destroy the session
session_unset();
session_destroy();

// Clear session cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Also clear any other auth-related cookies
setcookie('PHPSESSID', '', time() - 3600, '/');

header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'message' => 'Session cleaned up successfully',
    'timestamp' => time()
]);
exit;
?>