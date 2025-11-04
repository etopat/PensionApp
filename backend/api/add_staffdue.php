<?php
// backend/api/add_staffdue.php
session_start();
header('Content-Type: application/json');
require_once '../config/db_connect.php';

// Role-based restriction (admin & clerk only)
if (!isset($_SESSION['role']) || !in_array($_SESSION['role'], ['admin', 'clerk'])) {
    echo json_encode(['success' => false, 'message' => 'Access denied.']);
    exit;
}

// Validate essential fields
$required = ['regNo','supplierNo','title','sName','fName','gender','prisonUnit','NIN',
'telNo','birthDate','enlistmentDate','retirementDate','financialYear','retirementType',
'monthlySalary','submissionStatus','appnStatus'];

foreach ($required as $field) {
    if (empty($_POST[$field])) {
        echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
        exit;
    }
}

try {
    $stmt = $conn->prepare("
        INSERT INTO tb_staffdue 
        (regNo, supplierNo, title, sName, fName, gender, prisonUnit, NIN, telNo, birthDate, enlistmentDate, retirementDate, financialYear, retirementType, monthlySalary, lengthOfService, annualSalary, reducedPension, fullPension, gratuity, submissionStatus, appnStatus)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ");

    $stmt->execute([
        $_POST['regNo'],
        $_POST['supplierNo'],
        $_POST['title'],
        $_POST['sName'],
        $_POST['fName'],
        $_POST['gender'],
        $_POST['prisonUnit'],
        $_POST['NIN'],
        $_POST['telNo'],
        $_POST['birthDate'],
        $_POST['enlistmentDate'],
        $_POST['retirementDate'],
        $_POST['financialYear'],
        $_POST['retirementType'],
        $_POST['monthlySalary'],
        $_POST['lengthOfService'] ?? 0,
        $_POST['annualSalary'] ?? 0,
        $_POST['reducedPension'] ?? 0,
        $_POST['fullPension'] ?? 0,
        $_POST['gratuity'] ?? 0,
        $_POST['submissionStatus'],
        $_POST['appnStatus']
    ]);

    echo json_encode(['success' => true, 'message' => 'Staff record successfully added!']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error: '.$e->getMessage()]);
}
?>
