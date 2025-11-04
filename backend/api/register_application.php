<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

if (!isset($_SESSION['userRole']) || $_SESSION['userRole'] === 'pensioner') {
  echo json_encode(['success' => false, 'message' => 'Access denied']);
  exit;
}

$id = intval($_POST['id'] ?? 0);
if ($id <= 0) {
  echo json_encode(['success' => false, 'message' => 'Invalid ID']);
  exit;
}

$conn->begin_transaction();

try {
  // Update submissionStatus
  $stmt1 = $conn->prepare("UPDATE tb_staffdue SET submissionStatus = 'submitted' WHERE id = ?");
  $stmt1->bind_param('i', $id);
  $stmt1->execute();

  // Insert into tb_appnsubmissions
  $stmt2 = $conn->prepare("INSERT INTO tb_appnsubmissions (Id, submissionDate, comment) VALUES (?, NOW(), '')");
  $stmt2->bind_param('i', $id);
  $stmt2->execute();

  $conn->commit();
  echo json_encode(['success' => true, 'message' => 'Application registered successfully']);
} catch (Exception $e) {
  $conn->rollback();
  echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
$conn->close();
?>
