<?php
// ============================================================================
// delete_message.php
// Purpose: Soft delete message for recipient or fully remove if all deleted
//          Proper deletion logic for both recipients and senders
//          Allow senders to delete their own messages
// ============================================================================

require_once __DIR__ . '/../config.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

if (!isset($_SESSION['userId'])) {
    echo json_encode(['success' => false, 'message' => 'Session expired']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$messageIds = $data["ids"] ?? [];
if (!is_array($messageIds) || empty($messageIds)) {
    echo json_encode(['success' => false, 'message' => 'No messages selected']);
    exit;
}

try {
    $userId = $_SESSION['userId'];
    $conn->begin_transaction();

    // Validate and cast to integers
    $validIds = [];
    foreach ($messageIds as $mid) {
        $id = intval($mid);
        if ($id > 0) $validIds[] = $id;
    }
    if (empty($validIds)) {
        throw new Exception('No valid message IDs provided');
    }

    // Create placeholders for prepared statement
    $placeholders = str_repeat('?,', count($validIds) - 1) . '?';
    
    // Check if user is recipient or sender
    $checkStmt = $conn->prepare("
        SELECT m.message_id, m.sender_id, mr.recipient_user_id
        FROM tb_messages m
        LEFT JOIN tb_message_recipients mr ON m.message_id = mr.message_id AND mr.recipient_user_id = ?
        WHERE m.message_id IN ($placeholders)
    ");
    
    $types = str_repeat('i', count($validIds));
    $checkStmt->bind_param("s" . $types, $userId, ...$validIds);
    $checkStmt->execute();
    $messages = $checkStmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $checkStmt->close();

    foreach ($messages as $message) {
        $messageId = $message['message_id'];
        
        // If user is recipient, soft delete
        if ($message['recipient_user_id'] === $userId) {
            $delStmt = $conn->prepare("
                UPDATE tb_message_recipients
                SET is_deleted = TRUE, deleted_at = NOW()
                WHERE message_id = ? AND recipient_user_id = ?
            ");
            $delStmt->bind_param("is", $messageId, $userId);
            $delStmt->execute();
            $delStmt->close();
        }
        
        // NEW: If user is sender, mark as deleted for sender (allow sender to delete)
        if ($message['sender_id'] === $userId) {
            $senderDelStmt = $conn->prepare("
                UPDATE tb_messages 
                SET is_deleted = TRUE 
                WHERE message_id = ? AND sender_id = ?
            ");
            $senderDelStmt->bind_param("is", $messageId, $userId);
            $senderDelStmt->execute();
            $senderDelStmt->close();
            
            // Also remove any broadcast associations if this was a broadcast
            $broadcastDelStmt = $conn->prepare("
                UPDATE tb_broadcast_messages 
                SET is_active = FALSE 
                WHERE message_id = ?
            ");
            $broadcastDelStmt->bind_param("i", $messageId);
            $broadcastDelStmt->execute();
            $broadcastDelStmt->close();
        }
    }

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Message(s) deleted successfully']);
} catch (Exception $e) {
    $conn->rollback();
    error_log("delete_message error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
$conn->close();
?>