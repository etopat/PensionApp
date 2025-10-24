<?php
/**
 * ============================================================
 * UPDATE USER API
 * ============================================================
 * Updates user information and replaces old profile images.
 * ============================================================
 */

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
    // Fetch current photo
    $stmt = $conn->prepare("SELECT userPhoto FROM tb_users WHERE userId = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $current = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $updateFields = [];
    $params = [];
    $types = '';

    $updateFields[] = "userTitle = ?";
    $params[] = $userTitle; $types .= 's';

    $updateFields[] = "userName = ?";
    $params[] = $userName; $types .= 's';

    $updateFields[] = "userEmail = ?";
    $params[] = $userEmail; $types .= 's';

    if (!empty($userRole)) {
        $updateFields[] = "userRole = ?";
        $params[] = $userRole; $types .= 's';
    }

    if (!empty($newPassword)) {
        $updateFields[] = "userPassword = ?";
        $params[] = password_hash($newPassword, PASSWORD_DEFAULT);
        $types .= 's';
    }

    // Handle profile image replacement
    if (isset($_FILES['profilePicture']) && $_FILES['profilePicture']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/../uploads/profiles/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

        // Delete old image
        if (!empty($current['userPhoto']) && $current['userPhoto'] !== '../uploads/profiles/default-user.png') {
            $oldPath = __DIR__ . '/../' . str_replace('../', '', $current['userPhoto']);
            if (file_exists($oldPath)) unlink($oldPath);
        }

        // Upload new
        $ext = strtolower(pathinfo($_FILES['profilePicture']['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png'];
        if (in_array($ext, $allowed)) {
            $newFilename = uniqid('profile_', true) . '.' . $ext;
            $targetPath = $uploadDir . $newFilename;
            move_uploaded_file($_FILES['profilePicture']['tmp_name'], $targetPath);
            $photoPath = '../uploads/profiles/' . $newFilename;
            $updateFields[] = "userPhoto = ?";
            $params[] = $photoPath; $types .= 's';
        }
    }

    $params[] = $userId; $types .= 's';
    $sql = "UPDATE tb_users SET " . implode(', ', $updateFields) . " WHERE userId = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'User updated successfully']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

if (isset($stmt)) $stmt->close();
$conn->close();
?>
