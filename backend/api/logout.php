<?php
// backend/api/logout.php (Enhanced with Session Cleanup)
session_start();
require_once __DIR__ . '/../config.php';

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
    'message' => 'You have been successfully logged out.'
]);
exit;
?>