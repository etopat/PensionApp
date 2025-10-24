<?php
/**
 * ============================================================
 * DELETE USER API
 * ============================================================
 * Deletes user record and associated profile image
 * from ../uploads/profiles/ directory.
 * ============================================================
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$userId = $data['userId'] ?? '';

if (empty($userId)) {
    echo json_encode(['success' => false, 'message' => 'User ID is required']);
    exit;
}

try {
    // Fetch user photo path before deletion
    $stmt = $conn->prepare("SELECT userPhoto FROM tb_users WHERE userId = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();

    // Delete associated image file
    if (!empty($row['userPhoto']) && $row['userPhoto'] !== '../uploads/profiles/default-user.png') {
        $photoPath = __DIR__ . '/../' . str_replace('../', '', $row['userPhoto']);
        if (file_exists($photoPath)) {
            unlink($photoPath);
        }
    }

    // Delete user record
    $stmt = $conn->prepare("DELETE FROM tb_users WHERE userId = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'User and associated image deleted successfully']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

if (isset($stmt)) $stmt->close();
$conn->close();
?>
