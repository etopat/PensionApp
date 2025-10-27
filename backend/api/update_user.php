<?php
/**
 * ============================================================
 * UPDATE USER API - COMPATIBLE WITH CURRENT SCHEMA
 * ============================================================
 * Works with existing tb_users table structure
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

/**
 * Optimizes and resizes image
 */
function optimizeImage($sourcePath, $targetPath, $maxWidth = 400, $maxHeight = 400, $quality = 75) {
    if (!file_exists($sourcePath)) {
        throw new Exception('Source image not found');
    }

    $imageInfo = getimagesize($sourcePath);
    if (!$imageInfo) {
        throw new Exception('Invalid image file');
    }

    $mimeType = $imageInfo['mime'];
    $originalWidth = $imageInfo[0];
    $originalHeight = $imageInfo[1];

    switch ($mimeType) {
        case 'image/jpeg':
            $sourceImage = imagecreatefromjpeg($sourcePath);
            break;
        case 'image/png':
            $sourceImage = imagecreatefrompng($sourcePath);
            break;
        case 'image/gif':
            $sourceImage = imagecreatefromgif($sourcePath);
            break;
        case 'image/webp':
            $sourceImage = imagecreatefromwebp($sourcePath);
            break;
        default:
            throw new Exception('Unsupported image format: ' . $mimeType);
    }

    if (!$sourceImage) {
        throw new Exception('Failed to create image resource');
    }

    // Calculate new dimensions maintaining aspect ratio
    $ratio = $originalWidth / $originalHeight;
    
    if ($maxWidth / $maxHeight > $ratio) {
        $newWidth = $maxHeight * $ratio;
        $newHeight = $maxHeight;
    } else {
        $newWidth = $maxWidth;
        $newHeight = $maxWidth / $ratio;
    }

    $newWidth = round($newWidth);
    $newHeight = round($newHeight);

    $newImage = imagecreatetruecolor($newWidth, $newHeight);

    // Preserve transparency for PNG and GIF
    if ($mimeType == 'image/png' || $mimeType == 'image/gif') {
        imagecolortransparent($newImage, imagecolorallocatealpha($newImage, 0, 0, 0, 127));
        imagealphablending($newImage, false);
        imagesavealpha($newImage, true);
    }

    imagecopyresampled($newImage, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $originalWidth, $originalHeight);

    $result = imagejpeg($newImage, $targetPath, $quality);

    imagedestroy($sourceImage);
    imagedestroy($newImage);

    if (!$result) {
        throw new Exception('Failed to save optimized image');
    }

    return true;
}

/**
 * Creates WebP version (optional - for future use)
 */
function createWebPVersion($sourcePath, $targetPath, $quality = 65) {
    if (!file_exists($sourcePath)) return false;

    $imageInfo = getimagesize($sourcePath);
    if (!$imageInfo) return false;

    $mimeType = $imageInfo['mime'];
    $sourceImage = null;

    switch ($mimeType) {
        case 'image/jpeg':
            $sourceImage = imagecreatefromjpeg($sourcePath);
            break;
        case 'image/png':
            $sourceImage = imagecreatefrompng($sourcePath);
            imagealphablending($sourceImage, false);
            imagesavealpha($sourceImage, true);
            break;
        case 'image/gif':
            $sourceImage = imagecreatefromgif($sourcePath);
            break;
        default:
            return false;
    }

    if (!$sourceImage) return false;

    $result = imagewebp($sourceImage, $targetPath, $quality);
    imagedestroy($sourceImage);

    return $result;
}

/**
 * Extracts base filename without extension from path
 */
function getBaseFilename($path) {
    $filename = basename($path);
    return pathinfo($filename, PATHINFO_FILENAME);
}

/**
 * Deletes old profile images when replacing
 */
function deleteOldProfileImages($photoPath) {
    if (empty($photoPath) || $photoPath === '../uploads/profiles/default-user.png') {
        return;
    }

    $uploadDir = __DIR__ . '/../uploads/profiles/';
    
    // Delete the main image file
    $mainPath = __DIR__ . '/../' . str_replace('../', '', $photoPath);
    if (file_exists($mainPath)) {
        unlink($mainPath);
    }

    // Also delete any other potential formats with the same base name
    $baseName = getBaseFilename($photoPath);
    $patterns = [
        $uploadDir . $baseName . '.jpg',
        $uploadDir . $baseName . '.jpeg', 
        $uploadDir . $baseName . '.png',
        $uploadDir . $baseName . '.webp',
        $uploadDir . $baseName . '.gif'
    ];

    foreach ($patterns as $pattern) {
        if (file_exists($pattern)) {
            unlink($pattern);
        }
    }
}

try {
    // Fetch current user data
    $stmt = $conn->prepare("SELECT userPhoto FROM tb_users WHERE userId = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $current = $result->fetch_assoc();
    $stmt->close();

    if (!$current) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }

    $updateFields = [];
    $params = [];
    $types = '';

    // Add basic fields
    $updateFields[] = "userTitle = ?";
    $params[] = $userTitle; 
    $types .= 's';

    $updateFields[] = "userName = ?";
    $params[] = $userName; 
    $types .= 's';

    $updateFields[] = "userEmail = ?";
    $params[] = $userEmail; 
    $types .= 's';

    if (!empty($userRole)) {
        $updateFields[] = "userRole = ?";
        $params[] = $userRole; 
        $types .= 's';
    }

    if (!empty($newPassword)) {
        $updateFields[] = "userPassword = ?";
        $params[] = password_hash($newPassword, PASSWORD_DEFAULT);
        $types .= 's';
    }

    // Handle profile image replacement with optimization
    if (isset($_FILES['profilePicture']) && $_FILES['profilePicture']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/../uploads/profiles/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

        $tmpPath = $_FILES['profilePicture']['tmp_name'];
        $origName = $_FILES['profilePicture']['name'];
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'webp'];

        // Validate file type and size
        if (!in_array($ext, $allowed)) {
            echo json_encode(['success' => false, 'message' => 'Invalid image format. Only jpg, jpeg, png, webp allowed.']);
            exit;
        }

        if ($_FILES['profilePicture']['size'] > 5 * 1024 * 1024) {
            echo json_encode(['success' => false, 'message' => 'Image size must be less than 5MB.']);
            exit;
        }

        // Generate base filename from existing photo or create new one
        $baseFilename = '';
        if (!empty($current['userPhoto']) && $current['userPhoto'] !== '../uploads/profiles/default-user.png') {
            $baseFilename = getBaseFilename($current['userPhoto']);
        } else {
            $baseFilename = uniqid('profile_', true);
        }

        $jpgPath = $uploadDir . $baseFilename . '.jpg';

        try {
            // Delete old images first (if they exist)
            if (!empty($current['userPhoto'])) {
                deleteOldProfileImages($current['userPhoto']);
            }

            // Optimize and save new image as JPEG
            optimizeImage($tmpPath, $jpgPath, 400, 400, 75);

            // Optional: Create WebP version (can be used later when you add the column)
            // $webpPathFile = $uploadDir . $baseFilename . '.webp';
            // createWebPVersion($jpgPath, $webpPathFile, 65);

            // Update database path
            $photoPath = '../uploads/profiles/' . $baseFilename . '.jpg';
            $updateFields[] = "userPhoto = ?";
            $params[] = $photoPath; 
            $types .= 's';

        } catch (Exception $e) {
            // Fallback: use original file without optimization
            $fallbackPath = $uploadDir . $baseFilename . '.' . $ext;
            if (move_uploaded_file($tmpPath, $fallbackPath)) {
                $photoPath = '../uploads/profiles/' . $baseFilename . '.' . $ext;
                $updateFields[] = "userPhoto = ?";
                $params[] = $photoPath; 
                $types .= 's';
            } else {
                throw new Exception('Failed to save image: ' . $e->getMessage());
            }
        }
    }

    // Build and execute update query
    $params[] = $userId; 
    $types .= 's';
    
    $sql = "UPDATE tb_users SET " . implode(', ', $updateFields) . " WHERE userId = ?";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception('Failed to prepare update statement: ' . $conn->error);
    }
    
    $stmt->bind_param($types, ...$params);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to execute update: ' . $stmt->error);
    }

    echo json_encode([
        'success' => true, 
        'message' => 'User updated successfully',
        'photoUpdated' => isset($_FILES['profilePicture'])
    ]);

} catch (Exception $e) {
    error_log("Update user error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

if (isset($stmt)) $stmt->close();
$conn->close();
?>