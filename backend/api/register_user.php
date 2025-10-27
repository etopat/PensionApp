<?php
// backend/api/register_user.php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php';

$logFile = __DIR__ . '/../logs/register_errors.log';
$uploadDir = __DIR__ . '/../uploads/profiles/';

// Ensure upload & logs dirs exist
if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
if (!is_dir(dirname($logFile))) mkdir(dirname($logFile), 0777, true);

function respond($success, $message, $extra = []) {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit;
}

function logError($msg) {
    global $logFile;
    $line = "[" . date('Y-m-d H:i:s') . "] " . $msg . PHP_EOL;
    file_put_contents($logFile, $line, FILE_APPEND);
}

/**
 * Optimizes and resizes image with multiple compression techniques
 */
function optimizeImage($sourcePath, $targetPath, $maxWidth = 400, $maxHeight = 400, $quality = 75) {
    if (!file_exists($sourcePath)) {
        throw new Exception('Source image not found');
    }

    // Get image info
    $imageInfo = getimagesize($sourcePath);
    if (!$imageInfo) {
        throw new Exception('Invalid image file');
    }

    $mimeType = $imageInfo['mime'];
    $originalWidth = $imageInfo[0];
    $originalHeight = $imageInfo[1];

    // Create image resource based on mime type
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

    // Create new image
    $newImage = imagecreatetruecolor($newWidth, $newHeight);

    // Preserve transparency for PNG and GIF
    if ($mimeType == 'image/png' || $mimeType == 'image/gif') {
        imagecolortransparent($newImage, imagecolorallocatealpha($newImage, 0, 0, 0, 127));
        imagealphablending($newImage, false);
        imagesavealpha($newImage, true);
    }

    // Resize image with high-quality resampling
    imagecopyresampled($newImage, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $originalWidth, $originalHeight);

    // Save optimized image as JPEG (smallest file size)
    $result = imagejpeg($newImage, $targetPath, $quality);

    // Clean up memory
    imagedestroy($sourceImage);
    imagedestroy($newImage);

    if (!$result) {
        throw new Exception('Failed to save optimized image');
    }

    return true;
}

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Invalid request method. POST required.');
}

// Validate required fields presence
$required = ['userTitle', 'userName', 'userRole', 'userEmail', 'userPassword'];
foreach ($required as $r) {
    if (!isset($_POST[$r]) || trim($_POST[$r]) === '') {
        respond(false, "Missing required field: $r");
    }
}

// Sanitize inputs
$userTitle = substr(trim($_POST['userTitle']), 0, 20);
$userName  = substr(trim($_POST['userName']), 0, 100); // Matches your VARCHAR(100)
$userRole  = substr(trim($_POST['userRole']), 0, 50);
$userEmail = strtolower(trim($_POST['userEmail']));
$passwordPlain = $_POST['userPassword'];
$other = '';

// Validate userRole against your ENUM values
$allowedRoles = ['admin', 'clerk', 'oc_pen', 'writeup_officer', 'file_creator', 'data_entry', 'assessor', 'auditor', 'approver', 'user', 'pensioner'];
if (!in_array($userRole, $allowedRoles)) {
    respond(false, 'Invalid user role specified.');
}

// Server-side password validation (same rules as client)
if (!preg_match('/[a-z]/', $passwordPlain) || !preg_match('/[A-Z]/', $passwordPlain) || !preg_match('/\d/', $passwordPlain) || strlen($passwordPlain) < 6) {
    respond(false, 'Password does not meet complexity requirements.');
}

// Check email uniqueness
$emailCheckStmt = $conn->prepare("SELECT Id FROM tb_users WHERE userEmail = ?");
if (!$emailCheckStmt) {
    logError("Prepare failed (email check): " . $conn->error);
    respond(false, 'Server error (email check).');
}
$emailCheckStmt->bind_param('s', $userEmail);
$emailCheckStmt->execute();
$emailCheckStmt->store_result();
if ($emailCheckStmt->num_rows > 0) {
    $emailCheckStmt->close();
    respond(false, 'Email already registered.');
}
$emailCheckStmt->close();

// Generate short 4-char code (base36) and ensure uniqueness if storing later
$shortCode = strtoupper(substr(base_convert(random_int(100000, 999999), 10, 36), 0, 4));
$userIdHash = hash('sha256', $shortCode); // STORE THIS in DB as userId

// Hash password for storage
$userPasswordHash = password_hash($passwordPlain, PASSWORD_DEFAULT);

// Handle optional file upload with optimization
$photoPath = ''; // relative path to save in DB (empty if none)

if (isset($_FILES['userPhoto']) && $_FILES['userPhoto']['error'] !== UPLOAD_ERR_NO_FILE) {
    $fileErr = $_FILES['userPhoto']['error'];
    if ($fileErr !== UPLOAD_ERR_OK) {
        logError("Upload error code: $fileErr");
        respond(false, 'Error uploading file.');
    }

    $tmpPath = $_FILES['userPhoto']['tmp_name'];
    $origName = $_FILES['userPhoto']['name'];
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    $allowed = ['jpg','jpeg','png','webp'];

    if (!in_array($ext, $allowed)) {
        respond(false, 'Invalid image format. Only jpg, jpeg, png, webp are allowed.');
    }

    // Validate file size (max 5MB)
    if ($_FILES['userPhoto']['size'] > 5 * 1024 * 1024) {
        respond(false, 'Image size must be less than 5MB.');
    }

    // Build new filename using the short code
    $baseFilename = $shortCode;
    $jpgPath = $uploadDir . $baseFilename . '.jpg';

    try {
        // Optimize and save as JPEG (primary format)
        optimizeImage($tmpPath, $jpgPath, 400, 400, 75);
        
        // Get file size for logging
        $jpgSize = filesize($jpgPath);
        logError("Image optimized - JPG: " . round($jpgSize/1024) . "KB");

        // Save relative path (from project root)
        $photoPath = 'backend/uploads/profiles/' . $baseFilename . '.jpg';

    } catch (Exception $e) {
        logError("Image optimization failed: " . $e->getMessage());
        // Fallback: move original file without optimization
        $fallbackPath = $uploadDir . $baseFilename . '.' . $ext;
        if (!move_uploaded_file($tmpPath, $fallbackPath)) {
            logError("Fallback move_uploaded_file failed to $fallbackPath");
            respond(false, 'Failed to store uploaded image.');
        }
        $photoPath = 'backend/uploads/profiles/' . $baseFilename . '.' . $ext;
    }
}

// Insert new user - using only existing columns from your schema
$insertSql = "INSERT INTO tb_users (userId, userTitle, userName, userRole, userEmail, userPassword, userPhoto, other) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($insertSql);
if (!$stmt) {
    logError("Prepare failed (insert): " . $conn->error);
    respond(false, 'Server error (prepare insert).');
}

$stmt->bind_param('ssssssss', $userIdHash, $userTitle, $userName, $userRole, $userEmail, $userPasswordHash, $photoPath, $other);

if (!$stmt->execute()) {
    $err = $stmt->error;
    logError("Execute failed (insert): " . $err);
    
    // Clean up uploaded files if database insert failed
    if ($photoPath) {
        $fullPath = __DIR__ . '/../' . str_replace('backend/', '', $photoPath);
        if (file_exists($fullPath)) unlink($fullPath);
    }
    
    respond(false, 'Registration failed. Database error.');
}

$stmt->close();
$conn->close();

// Success: return short code so the UI can show it (human reference)
respond(true, 'Registered successfully.', ['referenceCode' => $shortCode]);
?>