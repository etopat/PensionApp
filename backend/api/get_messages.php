<?php
// ============================================================================
// get_messages.php
// Purpose: Fetch messages for the logged-in user
// Fixed: Sent messages show in correct module with recipient avatars
// Fixed: Proper message type filtering and counts
// ============================================================================

require_once __DIR__ . '/../config.php';

if (!isset($_SESSION['userId'])) {
    header('HTTP/1.1 401 Unauthorized');
    echo json_encode(['success' => false, 'message' => 'Session expired']);
    exit;
}

header('Content-Type: application/json');

try {
    $userId = $_SESSION['userId'];
    $messageType = $_GET['type'] ?? 'inbox';
    $page = $_GET['page'] ?? 1;
    $limit = $_GET['limit'] ?? 20;
    $offset = ($page - 1) * $limit;

    $response = [];

    switch ($messageType) {
        case 'inbox':
            // Get received messages (FIXED: Only show messages where user is recipient)
            $stmt = $conn->prepare("
                SELECT 
                    m.message_id,
                    m.sender_id,
                    m.subject,
                    SUBSTRING(m.message_text, 1, 200) as preview,
                    m.message_type,
                    m.is_urgent,
                    m.created_at,
                    mr.is_read,
                    mr.read_at,
                    u.userName as sender_name,
                    u.userRole as sender_role,
                    u.userPhoto as sender_photo,
                    COUNT(DISTINCT a.attachment_id) as attachment_count
                FROM tb_messages m
                INNER JOIN tb_message_recipients mr ON m.message_id = mr.message_id
                INNER JOIN tb_users u ON m.sender_id = u.userId
                LEFT JOIN tb_message_attachments a ON m.message_id = a.message_id
                WHERE mr.recipient_user_id = ? 
                AND mr.is_deleted = FALSE
                AND m.message_type IN ('direct', 'group')
                GROUP BY m.message_id
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->bind_param("sii", $userId, $limit, $offset);
            break;

        case 'sent':
            // Get sent messages (FIXED: Show recipient info instead of sender info)
            $stmt = $conn->prepare("
                SELECT 
                    m.message_id,
                    m.subject,
                    SUBSTRING(m.message_text, 1, 200) as preview,
                    m.message_type,
                    m.is_urgent,
                    m.created_at,
                    COUNT(DISTINCT mr.recipient_user_id) as recipient_count,
                    COUNT(DISTINCT a.attachment_id) as attachment_count,
                    GROUP_CONCAT(u.userName SEPARATOR ', ') as recipient_names,
                    u.userPhoto as recipient_photo,
                    u.userName as primary_recipient_name
                FROM tb_messages m
                LEFT JOIN tb_message_recipients mr ON m.message_id = mr.message_id
                LEFT JOIN tb_users u ON mr.recipient_user_id = u.userId
                LEFT JOIN tb_message_attachments a ON m.message_id = a.message_id
                WHERE m.sender_id = ?
                AND m.message_type IN ('direct', 'group')
                GROUP BY m.message_id
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->bind_param("sii", $userId, $limit, $offset);
            break;

        case 'broadcast':
            // Get broadcast messages
            $stmt = $conn->prepare("
                SELECT 
                    m.message_id,
                    m.sender_id,
                    m.subject,
                    SUBSTRING(m.message_text, 1, 200) as preview,
                    m.is_urgent,
                    m.created_at,
                    u.userName as sender_name,
                    u.userRole as sender_role,
                    ubs.is_seen,
                    ubs.seen_at,
                    COUNT(DISTINCT a.attachment_id) as attachment_count
                FROM tb_messages m
                INNER JOIN tb_broadcast_messages bm ON m.message_id = bm.message_id
                INNER JOIN tb_users u ON m.sender_id = u.userId
                LEFT JOIN tb_user_broadcast_status ubs ON (bm.broadcast_id = ubs.broadcast_id AND ubs.user_id = ?)
                LEFT JOIN tb_message_attachments a ON m.message_id = a.message_id
                WHERE bm.is_active = TRUE
                GROUP BY m.message_id
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->bind_param("sii", $userId, $limit, $offset);
            break;
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $messages = [];

    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }

    // Get total count for pagination (FIXED: Separate counts for each type)
    if ($messageType === 'inbox') {
        $countStmt = $conn->prepare("
            SELECT COUNT(*) as total 
            FROM tb_message_recipients mr
            INNER JOIN tb_messages m ON mr.message_id = m.message_id
            WHERE mr.recipient_user_id = ? 
            AND mr.is_deleted = FALSE
            AND m.message_type IN ('direct', 'group')
        ");
        $countStmt->bind_param("s", $userId);
    } elseif ($messageType === 'sent') {
        $countStmt = $conn->prepare("
            SELECT COUNT(*) as total 
            FROM tb_messages m
            WHERE m.sender_id = ?
            AND m.message_type IN ('direct', 'group')
        ");
        $countStmt->bind_param("s", $userId);
    } else {
        $countStmt = $conn->prepare("
            SELECT COUNT(*) as total 
            FROM tb_broadcast_messages bm
            INNER JOIN tb_messages m ON bm.message_id = m.message_id
            WHERE bm.is_active = TRUE
        ");
    }
    
    $countStmt->execute();
    $countResult = $countStmt->get_result();
    $total = $countResult->fetch_assoc()['total'];
    $countStmt->close();

    echo json_encode([
        'success' => true,
        'messages' => $messages,
        'pagination' => [
            'page' => (int)$page,
            'limit' => (int)$limit,
            'total' => (int)$total,
            'pages' => ceil($total / $limit)
        ]
    ]);

} catch (Exception $e) {
    error_log("Get messages error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching messages'
    ]);
}

$conn->close();
?>