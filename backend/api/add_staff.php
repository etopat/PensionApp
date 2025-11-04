<?php
/**
 * ============================================================
 * ADD STAFF API (Improved & Secure Version)
 * ============================================================
 * Inserts a new staff due record into tb_staffdue.
 * - Only accessible to users with 'admin' or 'clerk' roles.
 * - Validates and sanitizes all inputs.
 * - Handles optional fields gracefully.
 * - Returns JSON response.
 * ============================================================
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

// ------------------------------------------------------------
// 1️⃣ Access Control — Only admin or clerk
// ------------------------------------------------------------
if (!isset($_SESSION['userRole']) || !in_array($_SESSION['userRole'], ['admin', 'clerk'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit;
}

// ------------------------------------------------------------
// 2️⃣ Get and Validate Input
// ------------------------------------------------------------
$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !is_array($data)) {
    echo json_encode(['success' => false, 'message' => 'Invalid input']);
    exit;
}

// ------------------------------------------------------------
// 3️⃣ Sanitize and Normalize Input
// ------------------------------------------------------------
$fields = [
    'regNo', 'supplierNo', 'title', 'sName', 'fName', 'gender',
    'prisonUnit', 'NIN', 'telNo', 'birthDate', 'enlistmentDate',
    'retirementDate', 'financialYear', 'retirementType', 'monthlySalary',
    'lengthOfService', 'annualSalary', 'reducedPension', 'fullPension',
    'gratuity', 'submissionStatus', 'appnStatus'
];

// Default all missing fields to safe empty values
foreach ($fields as $f) {
    if (!isset($data[$f]) || $data[$f] === null) {
        $data[$f] = '';
    }
}

// Convert numeric fields safely
$monthlySalary   = floatval($data['monthlySalary']);
$lengthOfService = intval($data['lengthOfService']);
$annualSalary    = floatval($data['annualSalary']);
$reducedPension  = floatval($data['reducedPension']);
$fullPension     = floatval($data['fullPension']);
$gratuity        = floatval($data['gratuity']);

// ------------------------------------------------------------
// 4️⃣ Basic Required Field Validation
// ------------------------------------------------------------
$required = ['regNo', 'sName', 'fName', 'gender', 'prisonUnit', 'retirementType'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        echo json_encode(['success' => false, 'message' => 'Please fill in all required fields before submitting.']);
        exit;
    }
}

// ------------------------------------------------------------
// 5️⃣ Prepare SQL Statement
// ------------------------------------------------------------
$stmt = $conn->prepare("
    INSERT INTO tb_staffdue (
        regNo, supplierNo, title, sName, fName, gender, prisonUnit, NIN, telNo, birthDate,
        enlistmentDate, retirementDate, financialYear, retirementType, monthlySalary,
        lengthOfService, annualSalary, reducedPension, fullPension, gratuity,
        submissionStatus, appnStatus
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
");

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
    exit;
}

$stmt->bind_param(
    "sssssssssssssdidddddss",
    $data['regNo'],
    $data['supplierNo'],
    $data['title'],
    $data['sName'],
    $data['fName'],
    $data['gender'],
    $data['prisonUnit'],
    $data['NIN'],
    $data['telNo'],
    $data['birthDate'],
    $data['enlistmentDate'],
    $data['retirementDate'],
    $data['financialYear'],
    $data['retirementType'],
    $monthlySalary,
    $lengthOfService,
    $annualSalary,
    $reducedPension,
    $fullPension,
    $gratuity,
    $data['submissionStatus'],
    $data['appnStatus']
);

// ------------------------------------------------------------
// 6️⃣ Execute and Return Response
// ------------------------------------------------------------
if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Staff added successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to insert record: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
