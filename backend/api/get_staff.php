<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

// Restrict pensioner access
if (!isset($_SESSION['userRole']) || $_SESSION['userRole'] === 'pensioner') {
    echo json_encode(['success' => false, 'message' => 'Access denied']);
    exit;
}

$id = intval($_GET['id'] ?? 0);
if ($id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid ID']);
    exit;
}

$stmt = $conn->prepare("SELECT * FROM tb_staffdue WHERE id = ?");
$stmt->bind_param('i', $id);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Record not found']);
    exit;
}

$staff = $result->fetch_assoc();

echo json_encode(['success' => true, 'record' => $staff]);
$stmt->close();
$conn->close();
?>
