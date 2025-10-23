<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

$userId = $_POST['userId'] ?? '';
$userTitle = $_POST['userTitle'] ?? '';
$userName = $_POST['userName'] ?? '';
$userEmail = $_POST['userEmail'] ?? '';
$userRole = $_POST['userRole'] ?? '';
$newPassword = $_POST['newPassword'] ?? '';

if (empty($userId)) {
    echo json_encode(['success' => false, 'message' => 'User ID is required']);
    exit;
}

try {
    // Start building the update query
    $updateFields = [];
    $params = [];
    $types = '';
    
    // Basic fields
    $updateFields[] = "userTitle = ?";
    $params[] = $userTitle;
    $types .= 's';
    
    $updateFields[] = "userName = ?";
    $params[] = $userName;
    $types .= 's';
    
    $updateFields[] = "userEmail = ?";
    $params[] = $userEmail;
    $types .= 's';
    
    // Role (only update if provided)
    if (!empty($userRole)) {
        $updateFields[] = "userRole = ?";
        $params[] = $userRole;
        $types .= 's';
    }
    
    // Password (only update if provided)
    if (!empty($newPassword)) {
        $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $updateFields[] = "userPassword = ?";
        $params[] = $passwordHash;
        $types .= 's';
    }
    
    // Profile picture (handle file upload)
    if (isset($_FILES['profilePicture']) && $_FILES['profilePicture']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/../uploads/profiles/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $file = $_FILES['profilePicture'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png'];
        
        if (in_array($ext, $allowed)) {
            // Generate unique filename
            $newFilename = uniqid() . '.' . $ext;
            $targetPath = $uploadDir . $newFilename;
            
            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                $photoPath = '../uploads/profiles/' . $newFilename;
                $updateFields[] = "userPhoto = ?";
                $params[] = $photoPath;
                $types .= 's';
            }
        }
    }
    
    // Add userId to params
    $params[] = $userId;
    $types .= 's';
    
    // Build and execute query
    $sql = "UPDATE tb_users SET " . implode(', ', $updateFields) . " WHERE userId = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'User updated successfully']);
    } else {
        throw new Exception('Failed to update user');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error updating user: ' . $e->getMessage()
    ]);
}

if (isset($stmt)) $stmt->close();
$conn->close();
?>