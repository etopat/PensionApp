<?php
/**
 * ============================================================
 * cleanup_session.php (Enhanced with Database Cleanup)
 * ------------------------------------------------------------
 * PURPOSE: 
 *   - Forcefully clears PHP session and cookies
 *   - COMPLETELY REMOVES session from database (not just mark as inactive)
 *   - Used when device conflicts or session expiry occurs
 *   - Prevents "ghost sessions" from triggering false device conflicts
 * ============================================================
 */

session_start();
require_once __DIR__ . '/../config.php';

// 🔥 ENHANCED: Completely remove session from database if it exists
if (isset($_SESSION['session_id'])) {
    $stmt = $conn->prepare("DELETE FROM tb_user_sessions WHERE session_id = ?");
    $stmt->bind_param("s", $_SESSION['session_id']);
    $stmt->execute();
    $stmt->close();
    
    error_log("🗑️ Complete session cleanup: Removed session " . $_SESSION['session_id'] . " from database");
}

// Also clean up any other expired sessions while we're at it
$expiryTime = date('Y-m-d H:i:s', time() - 1800); // 30 minutes
$cleanupStmt = $conn->prepare("DELETE FROM tb_user_sessions WHERE last_activity < ? OR is_active = 0");
$cleanupStmt->bind_param("s", $expiryTime);
$cleanupStmt->execute();
$cleanedCount = $cleanupStmt->affected_rows;
$cleanupStmt->close();

if ($cleanedCount > 0) {
    error_log("🧹 Additional cleanup: Removed $cleanedCount expired sessions");
}

// Completely destroy the PHP session
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
    'message' => 'Session completely cleaned up (PHP + Database)',
    'database_cleaned' => true,
    'expired_sessions_removed' => $cleanedCount,
    'timestamp' => time()
]);
exit;
?>