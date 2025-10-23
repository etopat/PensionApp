<?php
// backend/api/logout.php
session_start();

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
