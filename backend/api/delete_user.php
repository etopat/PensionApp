<?php
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
    // First, get user photo path to delete the file
    $stmt = $conn->prepare("SELECT userPhoto FROM tb_users WHERE userId = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        // Delete profile picture file if it exists and is not default
        if ($row['userPhoto'] && $row['userPhoto'] !== 'images/default-user.png') {
            $photoPath = __DIR__ . '/../' . $row['userPhoto'];
            if (file_exists($photoPath)) {
                unlink($photoPath);
            }
        }
    }
    $stmt->close();
    
    // Delete user from database
    $stmt = $conn->prepare("DELETE FROM tb_users WHERE userId = ?");
    $stmt->bind_param("s", $userId);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    } else {
        throw new Exception('Failed to delete user');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error deleting user: ' . $e->getMessage()
    ]);
}

if (isset($stmt)) $stmt->close();
$conn->close();
?>
