<?php
/**
 * ============================================================
 * terminate_other_sessions.php
 * ------------------------------------------------------------
 * Purpose:
 *   - Immediately terminates all other sessions when user confirms
 *   - Used when user confirms they want to log out from other devices
 * ============================================================
 */

session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

// Check if user is logged in
if (!isset($_SESSION['userId']) || !isset($_SESSION['session_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$userId = $_SESSION['userId'];
$currentSessionId = $_SESSION['session_id'];

try {
    // Terminate all other active sessions for this user
    $stmt = $conn->prepare("
        UPDATE tb_user_sessions 
        SET is_active = 0 
        WHERE user_id = ? AND session_id != ? AND is_active = 1
    ");
    $stmt->bind_param("ss", $userId, $currentSessionId);
    $stmt->execute();
    $affectedRows = $stmt->affected_rows;
    $stmt->close();
    
    // Log the termination for debugging
    error_log("Terminated $affectedRows sessions for user $userId");
    
    echo json_encode([
        'success' => true,
        'message' => "Terminated $affectedRows other session(s)",
        'terminatedCount' => $affectedRows
    ]);
    
} catch (Exception $e) {
    error_log("Error terminating sessions: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error terminating sessions: ' . $e->getMessage()]);
}
?>