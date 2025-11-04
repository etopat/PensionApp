<?php
session_start();
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json');

if (!isset($_SESSION['userRole']) || !in_array($_SESSION['userRole'], ['admin', 'clerk'])) {
    echo json_encode(['success' => false, 'message' => 'Access denied.']);
    exit;
}

$id = intval($_POST['id'] ?? 0);
if ($id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid record ID.']);
    exit;
}

// Sanitize inputs
$regNo = trim($_POST['regNo']);
$title = trim($_POST['title']);
$sName = trim($_POST['sName']);
$fName = trim($_POST['fName']);
$gender = trim($_POST['gender']);
$prisonUnit = trim($_POST['prisonUnit']);
$telNo = trim($_POST['telNo']);
$retirementType = trim($_POST['retirementType']);
$submissionStatus = trim($_POST['submissionStatus']);
$appnStatus = trim($_POST['appnStatus']);

// Validate tel number format
if (!preg_match("/^\+256\d{9}$/", $telNo)) {
    echo json_encode(['success' => false, 'message' => 'Invalid phone number format.']);
    exit;
}

$stmt = $conn->prepare("UPDATE tb_staffdue 
    SET title=?, sName=?, fName=?, gender=?, prisonUnit=?, telNo=?, retirementType=?, submissionStatus=?, appnStatus=? 
    WHERE id=? AND regNo=?");
$stmt->bind_param(
    "sssssssssis",
    $title,
    $sName,
    $fName,
    $gender,
    $prisonUnit,
    $telNo,
    $retirementType,
    $submissionStatus,
    $appnStatus,
    $id,
    $regNo
);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Record updated successfully.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Database update failed.']);
}

$stmt->close();
$conn->close();
?>
