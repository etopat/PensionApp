<?php
// backend/api/get_image.php
header('Content-Type: image/png');

$file = $_GET['file'] ?? '';
$type = $_GET['type'] ?? '';

if (empty($file)) {
    // Serve default image
    $defaultPath = __DIR__ . '/../../frontend/images/default-user.png';
    if (file_exists($defaultPath)) {
        readfile($defaultPath);
    } else {
        // Create a simple default image
        header('Content-Type: image/svg+xml');
        echo '<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#D4AF37"/><text x="50" y="50" font-family="Arial" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle">?</text></svg>';
    }
    exit;
}

// Security: Validate file type and path
$allowedTypes = ['profile'];
if (!in_array($type, $allowedTypes)) {
    http_response_code(400);
    exit;
}

// Security: Prevent directory traversal
if (strpos($file, '..') !== false || strpos($file, '/') !== false) {
    http_response_code(400);
    exit;
}

$uploadDir = __DIR__ . '/../uploads/profiles/';
$filePath = $uploadDir . $file;

if (file_exists($filePath)) {
    readfile($filePath);
} else {
    // File not found, serve default
    $defaultPath = __DIR__ . '/../../frontend/images/default-user.png';
    if (file_exists($defaultPath)) {
        readfile($defaultPath);
    } else {
        header('Content-Type: image/svg+xml');
        echo '<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#D4AF37"/><text x="50" y="50" font-family="Arial" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle">?</text></svg>';
    }
}
?>