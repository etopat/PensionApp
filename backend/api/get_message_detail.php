<?php
// ============================================================================
// get_message_detail.php
// Purpose: Get detailed message information + mark as read with proper access control
//          Allow access when only one party has deleted the message
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

    // Check access with proper logic
    $accessStmt = $conn->prepare("
        SELECT 
            m.message_id,
            m.sender_id,
            m.message_type,
            mr.recipient_user_id,
            mr.is_deleted as recipient_deleted,
            bm.broadcast_id,
            ubs.is_deleted as broadcast_deleted
        FROM tb_messages m
        LEFT JOIN tb_message_recipients mr ON m.message_id = mr.message_id AND mr.recipient_user_id = ?
        LEFT JOIN tb_broadcast_messages bm ON m.message_id = bm.message_id
        LEFT JOIN tb_user_broadcast_status ubs ON (bm.broadcast_id = ubs.broadcast_id AND ubs.user_id = ?)
        WHERE m.message_id = ?
        AND (
            -- User is sender AND hasn't deleted the message
            (m.sender_id = ? AND (m.is_deleted_by_sender = FALSE OR m.is_deleted_by_sender IS NULL))
            OR 
            -- User is recipient AND hasn't deleted the message  
            (mr.recipient_user_id = ? AND mr.is_deleted = FALSE)
            OR
            -- User can access broadcast AND hasn't deleted it
            (ubs.user_id = ? AND (ubs.is_deleted = FALSE OR ubs.is_deleted IS NULL))
        )
        LIMIT 1
    ");
    if (!$accessStmt) {
        throw new Exception("Access check prepare failed: " . $conn->error);
    }
    $accessStmt->bind_param("ssisss", $userId, $userId, $messageId, $userId, $userId, $userId);
    $accessStmt->execute();
    $accessResult = $accessStmt->get_result();
    $accessData = $accessResult->fetch_assoc();
    $accessStmt->close();

    if (!$accessData) {
        throw new Exception("Message not found or access denied");
    }

    $isSender = ($accessData['sender_id'] === $userId);
    $isRecipient = ($accessData['recipient_user_id'] === $userId && !$accessData['recipient_deleted']);
    $isBroadcast = !empty($accessData['broadcast_id']) && !$accessData['broadcast_deleted'];

    // Get message details
    $stmt = $conn->prepare("
        SELECT 
            m.message_id, 
            m.sender_id, 
            m.subject, 
            m.message_text, 
            m.message_type,
            m.is_urgent, 
            m.created_at,
            m.is_deleted_by_sender,
            u.userName AS sender_name, 
            u.userRole AS sender_role,
            u.userPhoto AS sender_photo, 
            u.userEmail AS sender_email
        FROM tb_messages m
        INNER JOIN tb_users u ON m.sender_id = u.userId
        WHERE m.message_id = ?
    ");
    if (!$stmt) {
        throw new Exception("Message detail prepare failed: " . $conn->error);
    }
    $stmt->bind_param("i", $messageId);
    $stmt->execute();
    $message = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$message) throw new Exception("Message not found");

    // Mark as read for recipients (only if this user is a recipient and not the sender)
    if ($isRecipient && !$isSender) {
        $markRead = $conn->prepare("
            UPDATE tb_message_recipients
            SET is_read = TRUE, read_at = NOW()
            WHERE message_id = ? AND recipient_user_id = ? AND is_read = FALSE
        ");
        if ($markRead) {
            $markRead->bind_param("is", $messageId, $userId);
            $markRead->execute();
            $markRead->close();
        }
    }

    // If this is a broadcast and user is not sender, mark as seen
    if ($isBroadcast && !$isSender) {
        $broadcastMark = $conn->prepare("
            INSERT INTO tb_user_broadcast_status (user_id, broadcast_id, is_seen, seen_at)
            VALUES (?, ?, TRUE, NOW())
            ON DUPLICATE KEY UPDATE is_seen = TRUE, seen_at = NOW()
        ");
        if ($broadcastMark) {
            $broadcastMark->bind_param("si", $userId, $accessData['broadcast_id']);
            $broadcastMark->execute();
            $broadcastMark->close();
        }
    }

    // FIXED: Get ALL recipients including deleted ones for sender view
    if ($isSender) {
        // Sender sees ALL recipients (including deleted ones)
        $recipientsStmt = $conn->prepare("
            SELECT 
                u.userId, 
                u.userName, 
                u.userRole, 
                u.userPhoto,
                mr.is_read, 
                mr.read_at,
                mr.is_deleted,
                mr.deleted_at
            FROM tb_message_recipients mr
            INNER JOIN tb_users u ON mr.recipient_user_id = u.userId
            WHERE mr.message_id = ?
            ORDER BY u.userName
        ");
    } else {
        // Recipients and broadcast viewers only see non-deleted recipients
        $recipientsStmt = $conn->prepare("
            SELECT 
                u.userId, 
                u.userName, 
                u.userRole, 
                u.userPhoto,
                mr.is_read, 
                mr.read_at,
                mr.is_deleted,
                mr.deleted_at
            FROM tb_message_recipients mr
            INNER JOIN tb_users u ON mr.recipient_user_id = u.userId
            WHERE mr.message_id = ?
            AND mr.is_deleted = FALSE
            ORDER BY u.userName
        ");
    }
    
    if ($recipientsStmt) {
        $recipientsStmt->bind_param("i", $messageId);
        $recipientsStmt->execute();
        $recipients = $recipientsStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $recipientsStmt->close();
    } else {
        $recipients = [];
    }

    // Get attachments
    $attachmentsStmt = $conn->prepare("
        SELECT 
            attachment_id, 
            file_name, 
            file_path, 
            file_size, 
            mime_type
        FROM tb_message_attachments
        WHERE message_id = ?
    ");
    if ($attachmentsStmt) {
        $attachmentsStmt->bind_param("i", $messageId);
        $attachmentsStmt->execute();
        $attachments = $attachmentsStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $attachmentsStmt->close();
    } else {
        $attachments = [];
    }

    echo json_encode([
        'success' => true,
        'message' => $message,
        'recipients' => $recipients,
        'attachments' => $attachments,
        'access_info' => [
            'is_sender' => $isSender,
            'is_recipient' => $isRecipient,
            'is_broadcast' => $isBroadcast
        ]
    ]);

} catch (Exception $e) {
    error_log("Message detail error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>