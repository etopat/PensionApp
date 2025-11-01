<?php
/**
 * ============================================================
 * UPDATE USER API (Supports phone number & photo optimization)
 * ============================================================
 * Updates user details in tb_users table:
 * - userTitle, userName, userEmail, phoneNo, userRole, userPassword, userPhoto
 * - Handles profile image optimization and safe replacement
 * ============================================================
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

// ----------------------------
// 1️⃣ Collect input
// ----------------------------
$userId = $_POST['userId'] ?? '';
$userTitle = $_POST['userTitle'] ?? '';
$userName = $_POST['userName'] ?? '';
$userEmail = $_POST['userEmail'] ?? '';
$phoneNo = $_POST['phoneNo'] ?? '';
$userRole = $_POST['userRole'] ?? '';
$newPassword = $_POST['newPassword'] ?? '';

if (empty($userId)) {
    echo json_encode(['success' => false, 'message' => 'User ID is required']);
    exit;
}

// ----------------------------
// 2️⃣ Validate phone format
// ----------------------------
if (!empty($phoneNo) && !preg_match('/^\+[1-9][0-9]{7,14}$/', $phoneNo)) {
    echo json_encode(['success' => false, 'message' => 'Invalid phone number format']);
    exit;
}

// ----------------------------
// 3️⃣ Image utilities
// ----------------------------
function optimizeImage($src, $dest, $maxW = 400, $maxH = 400, $quality = 75) {
    $info = getimagesize($src);
    if (!$info) throw new Exception('Invalid image file');
    [$width, $height] = $info;

    $mime = $info['mime'];
    switch ($mime) {
        case 'image/jpeg': $image = imagecreatefromjpeg($src); break;
        case 'image/png':  $image = imagecreatefrompng($src); break;
        case 'image/gif':  $image = imagecreatefromgif($src); break;
        default: throw new Exception('Unsupported format');
    }

    $ratio = min($maxW / $width, $maxH / $height);
    $newW = (int)($width * $ratio);
    $newH = (int)($height * $ratio);

    $newImg = imagecreatetruecolor($newW, $newH);
    imagecopyresampled($newImg, $image, 0, 0, 0, 0, $newW, $newH, $width, $height);
    imagejpeg($newImg, $dest, $quality);
    imagedestroy($image);
    imagedestroy($newImg);
}

function deleteOldPhoto($photo) {
    if (!$photo || strpos($photo, 'default-user') !== false) return;
    $path = __DIR__ . '/../' . str_replace('../', '', $photo);
    if (file_exists($path)) unlink($path);
}

// ----------------------------
// 4️⃣ Fetch current data
// ----------------------------
$stmt = $conn->prepare("SELECT userPhoto FROM tb_users WHERE userId = ?");
$stmt->bind_param("s", $userId);
$stmt->execute();
$current = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$current) {
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit;
}

// ----------------------------
// 5️⃣ Build dynamic update query
// ----------------------------
$fields = ["userTitle = ?", "userName = ?", "userEmail = ?", "phoneNo = ?"];
$params = [$userTitle, $userName, $userEmail, $phoneNo];
$types = "ssss";

if (!empty($userRole)) { $fields[] = "userRole = ?"; $params[] = $userRole; $types .= "s"; }
if (!empty($newPassword)) { $fields[] = "userPassword = ?"; $params[] = password_hash($newPassword, PASSWORD_DEFAULT); $types .= "s"; }

// ----------------------------
// 6️⃣ Handle profile picture upload
// ----------------------------
if (!empty($_FILES['profilePicture']['name'])) {
    $uploadDir = __DIR__ . '/../uploads/profiles/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

    $ext = strtolower(pathinfo($_FILES['profilePicture']['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png'];
    if (!in_array($ext, $allowed)) throw new Exception('Invalid image format');
    if ($_FILES['profilePicture']['size'] > 5 * 1024 * 1024) throw new Exception('File too large');

    $filename = uniqid('profile_', true) . '.jpg';
    $targetPath = $uploadDir . $filename;

    deleteOldPhoto($current['userPhoto']);
    optimizeImage($_FILES['profilePicture']['tmp_name'], $targetPath);

    $photoPath = '../uploads/profiles/' . $filename;
    $fields[] = "userPhoto = ?";
    $params[] = $photoPath;
    $types .= "s";
}

// ----------------------------
// 7️⃣ Execute update
// ----------------------------
$params[] = $userId;
$types .= "s";

$sql = "UPDATE tb_users SET " . implode(", ", $fields) . " WHERE userId = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$success = $stmt->execute();
$stmt->close();
$conn->close();

echo json_encode([
    'success' => $success,
    'message' => $success ? 'User updated successfully' : 'Failed to update user'
]);
?>
