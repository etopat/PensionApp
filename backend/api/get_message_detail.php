<?php
// ============================================================================
// get_message_detail.php
// Purpose: Get detailed message information + mark as read
// ============================================================================

require_once __DIR__ . '/../config.php';
header('Content-Type: application/json');

if (!isset($_SESSION['userId'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Session expired']);
    exit;
}

try {
    $userId = $_SESSION['userId'];
    $messageId = intval($_GET['message_id'] ?? 0);
    if (!$messageId) throw new Exception("Message ID required");

    // Get message details
    $stmt = $conn->prepare("
        SELECT 
            m.message_id, m.sender_id, m.subject, m.message_text, m.message_type,
            m.is_urgent, m.created_at,
            u.userName AS sender_name, u.userRole AS sender_role,
            u.userPhoto AS sender_photo, u.userEmail AS sender_email
        FROM tb_messages m
        INNER JOIN tb_users u ON m.sender_id = u.userId
        WHERE m.message_id = ?
    ");
    $stmt->bind_param("i", $messageId);
    $stmt->execute();
    $message = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$message) throw new Exception("Message not found");

    // Mark as read for recipients (only if this user is a recipient and not the sender)
    if ((string)$message['sender_id'] !== (string)$userId) {
        $markRead = $conn->prepare("
            UPDATE tb_message_recipients
            SET is_read = TRUE, read_at = NOW()
            WHERE message_id = ? AND recipient_user_id = ? AND is_read = FALSE
        ");
        $markRead->bind_param("is", $messageId, $userId);
        $markRead->execute();
        $markRead->close();

        // If this message is a broadcast, update/insert tb_user_broadcast_status
        $broadcastCheck = $conn->prepare("
            SELECT bm.broadcast_id FROM tb_broadcast_messages bm WHERE bm.message_id = ? LIMIT 1
        ");
        $broadcastCheck->bind_param("i", $messageId);
        $broadcastCheck->execute();
        $bRow = $broadcastCheck->get_result()->fetch_assoc();
        $broadcastCheck->close();

        if ($bRow && !empty($bRow['broadcast_id'])) {
            $broadcastId = (int)$bRow['broadcast_id'];

            $broadcastMark = $conn->prepare("
                INSERT INTO tb_user_broadcast_status (user_id, broadcast_id, is_seen, seen_at)
                VALUES (?, ?, TRUE, NOW())
                ON DUPLICATE KEY UPDATE is_seen = TRUE, seen_at = NOW()
            ");
            $broadcastMark->bind_param("si", $userId, $broadcastId);
            $broadcastMark->execute();
            $broadcastMark->close();
        }
    }

    // Get recipients
    $recipientsStmt = $conn->prepare("
        SELECT u.userId, u.userName, u.userRole, u.userPhoto,
               mr.is_read, mr.read_at
        FROM tb_message_recipients mr
        INNER JOIN tb_users u ON mr.recipient_user_id = u.userId
        WHERE mr.message_id = ?
        ORDER BY u.userName
    ");
    $recipientsStmt->bind_param("i", $messageId);
    $recipientsStmt->execute();
    $recipients = $recipientsStmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $recipientsStmt->close();

    // Get attachments
    $attachmentsStmt = $conn->prepare("
        SELECT attachment_id, file_name, file_path, file_size, mime_type
        FROM tb_message_attachments
        WHERE message_id = ?
    ");
    $attachmentsStmt->bind_param("i", $messageId);
    $attachmentsStmt->execute();
    $attachments = $attachmentsStmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $attachmentsStmt->close();

    echo json_encode([
        'success' => true,
        'message' => $message,
        'recipients' => $recipients,
        'attachments' => $attachments
    ]);
} catch (Exception $e) {
    error_log("Message detail error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
