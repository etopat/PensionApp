<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

// Only authenticated users except pensioners
if (!isset($_SESSION['userRole']) || $_SESSION['userRole'] === 'pensioner') {
  echo json_encode(['success' => false, 'message' => 'Access denied']);
  exit;
}

$search = trim($_GET['search'] ?? '');
$retirementType = trim($_GET['retirementType'] ?? '');
$submissionStatus = trim($_GET['submissionStatus'] ?? '');
$appnStatus = trim($_GET['appnStatus'] ?? '');

$sql = "SELECT id, regNo, title, sName, fName, prisonUnit, telNo, retirementType, submissionStatus, appnStatus
        FROM tb_staffdue WHERE 1=1";
$params = [];
$types = '';

if ($search !== '') {
  $sql .= " AND (regNo LIKE ? OR sName LIKE ? OR fName LIKE ?)";
  $searchTerm = "%$search%";
  $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
  $types .= 'sss';
}
if ($retirementType !== '') {
  $sql .= " AND retirementType = ?";
  $params[] = $retirementType;
  $types .= 's';
}
if ($submissionStatus !== '') {
  $sql .= " AND submissionStatus = ?";
  $params[] = $submissionStatus;
  $types .= 's';
}
if ($appnStatus !== '') {
  $sql .= " AND appnStatus = ?";
  $params[] = $appnStatus;
  $types .= 's';
}
$sql .= " ORDER BY id DESC";

$stmt = $conn->prepare($sql);
if ($types) $stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$records = [];
while ($row = $result->fetch_assoc()) $records[] = $row;

echo json_encode(['success' => true, 'records' => $records]);
$stmt->close();
$conn->close();
?>
