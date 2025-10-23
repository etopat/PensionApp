<?php
// backend/api/get_task_count.php
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

$userId = $_GET['userId'] ?? '';
$userRole = $_GET['userRole'] ?? '';

if (empty($userId)) {
    echo json_encode(['success' => false, 'message' => 'User ID required']);
    exit;
}

// Assuming you have a tasks table with status fields
// This query counts pending/assigned tasks for the user
$query = "SELECT COUNT(*) as taskCount FROM tb_tasks 
          WHERE (assigned_to = ? OR created_by = ?) 
          AND status IN ('pending', 'assigned', 'in_progress')";

$stmt = $conn->prepare($query);
$stmt->bind_param("ii", $userId, $userId);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode([
        'success' => true,
        'taskCount' => $row['taskCount']
    ]);
} else {
    echo json_encode([
        'success' => true,
        'taskCount' => 0
    ]);
}

$stmt->close();
$conn->close();
?>