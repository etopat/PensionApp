<?php
/**
 * ============================================================
 * SESSION CHECK API
 * ============================================================
 * Used by frontend JS to verify if a user session is active.
 * Returns JSON indicating whether session is valid or expired.
 * ============================================================
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

if (isset($_SESSION['userId'])) {
    echo json_encode([
        'active' => true,
        'userId' => $_SESSION['userId'],
        'userName' => $_SESSION['userName'],
        'userRole' => $_SESSION['userRole']
    ]);
} else {
    echo json_encode(['active' => false, 'message' => 'Session expired or invalid']);
}
?>
