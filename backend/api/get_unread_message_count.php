<?php
// backend/api/get_unread_message_count.php
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

$userId = $_GET['userId'] ?? '';

if (empty($userId)) {
    echo json_encode(['success' => false, 'message' => 'User ID required']);
    exit;
}

// Assuming you have a messages table with a 'read' status field
$stmt = $conn->prepare("SELECT COUNT(*) as unreadCount FROM tb_messages WHERE recipient_id = ? AND is_read = 0");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode([
        'success' => true,
        'unreadCount' => $row['unreadCount']
    ]);
} else {
    echo json_encode([
        'success' => true,
        'unreadCount' => 0
    ]);
}

$stmt->close();
$conn->close();
?>