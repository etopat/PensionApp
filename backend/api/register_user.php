<?php
// backend/api/register_user.php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config.php'; // ensures $conn (mysqli) is available

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
$userName  = substr(trim($_POST['userName']), 0, 200);
$userRole  = substr(trim($_POST['userRole']), 0, 50);
$userEmail = strtolower(trim($_POST['userEmail']));
$passwordPlain = $_POST['userPassword'];
$other = '';

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

// Handle optional file upload
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
    $allowed = ['jpg','jpeg','png'];

    if (!in_array($ext, $allowed)) {
        respond(false, 'Invalid image format. Only jpg, jpeg, png are allowed.');
    }

    // Build new filename using the short code (human ref)
    $newFilename = $shortCode . '.' . $ext;
    $targetPath = $uploadDir . $newFilename;

    // If GD functions available, resize to max width 400px while maintaining aspect ratio.
    $maxWidth = 400;
    $resizeOk = false;
    if (function_exists('getimagesize') && function_exists('imagecreatetruecolor') && function_exists('imagecopyresampled')) {
        $info = @getimagesize($tmpPath);
        if ($info === false) {
            logError("getimagesize failed for uploaded file: $tmpPath");
            respond(false, 'Uploaded image invalid.');
        }
        list($width, $height) = $info;

        if ($width > $maxWidth) {
            $scale = $maxWidth / $width;
            $newW = (int) round($maxWidth);
            $newH = (int) round($height * $scale);
            $dst = imagecreatetruecolor($newW, $newH);

            // Preserve transparency for PNG
            if ($ext === 'png') {
                $src = imagecreatefrompng($tmpPath);
                imagealphablending($dst, false);
                imagesavealpha($dst, true);
            } else {
                $src = imagecreatefromjpeg($tmpPath);
            }

            imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $width, $height);

            if ($ext === 'png') {
                imagepng($dst, $targetPath, 6);
            } else {
                imagejpeg($dst, $targetPath, 85);
            }

            imagedestroy($dst);
            imagedestroy($src);
            $resizeOk = true;
        }
    }

    // If not resized (either GD not installed or width <= maxWidth), move the file directly
    if (!$resizeOk) {
        if (!move_uploaded_file($tmpPath, $targetPath)) {
            logError("move_uploaded_file failed to $targetPath");
            respond(false, 'Failed to store uploaded image.');
        }
    }

    // Save relative path (from project root)
    // Using a path relative to backend (so you can display as ../backend/uploads/profiles/SHORT.ext from frontend)
    $photoPath = 'backend/uploads/profiles/' . $newFilename;
}

// Insert new user
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
    respond(false, 'Registration failed. Database error.');
}

$stmt->close();
$conn->close();

// Success: return short code so the UI can show it (human reference)
respond(true, 'Registered successfully.', ['referenceCode' => $shortCode]);
