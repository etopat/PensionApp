<?php
/**
 * ============================================================
 * verify_admin.php
 * Purpose: Verify if current user has admin privileges
 * ============================================================
 */

session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

if (!isset($_SESSION['userId']) || !isset($_SESSION['userRole'])) {
    echo json_encode([
        'success' => false,
        'is_admin' => false,
        'message' => 'Not logged in'
    ]);
    exit;
}

$isAdmin = ($_SESSION['userRole'] === 'admin');

echo json_encode([
    'success' => true,
    'is_admin' => $isAdmin,
    'user_id' => $_SESSION['userId'],
    'user_role' => $_SESSION['userRole']
]);
?>