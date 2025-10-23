<?php
// backend/api/get_image.php

$file = $_GET['file'] ?? '';
$type = $_GET['type'] ?? '';

// Set appropriate content type
if (strpos($file, '.png') !== false) {
    header('Content-Type: image/png');
} elseif (strpos($file, '.jpg') !== false || strpos($file, '.jpeg') !== false) {
    header('Content-Type: image/jpeg');
} else {
    header('Content-Type: image/png'); // default
}

if (empty($file)) {
    // Serve default image
    $defaultPath = __DIR__ . '/../../frontend/images/default-user.png';
    if (file_exists($defaultPath)) {
        readfile($defaultPath);
    } else {
        // Create a simple default image as fallback
        $im = imagecreate(100, 100);
        $bgColor = imagecolorallocate($im, 212, 175, 55); // Gold color
        $textColor = imagecolorallocate($im, 255, 255, 255);
        imagestring($im, 5, 30, 45, '?', $textColor);
        imagepng($im);
        imagedestroy($im);
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

// Define upload directory
$uploadDir = __DIR__ . '/../uploads/profiles/';
$filePath = $uploadDir . $file;

// Check if file exists in uploads directory
if (file_exists($filePath)) {
    readfile($filePath);
} else {
    // File not found in uploads, check if it's in the old path format
    $oldPath = __DIR__ . '/../' . $file;
    if (file_exists($oldPath)) {
        readfile($oldPath);
    } else {
        // File not found, serve default
        $defaultPath = __DIR__ . '/../../frontend/images/default-user.png';
        if (file_exists($defaultPath)) {
            readfile($defaultPath);
        } else {
            // Ultimate fallback - create a default image
            $im = imagecreate(100, 100);
            $bgColor = imagecolorallocate($im, 212, 175, 55); // Gold color
            $textColor = imagecolorallocate($im, 255, 255, 255);
            imagestring($im, 5, 30, 45, '?', $textColor);
            imagepng($im);
            imagedestroy($im);
        }
    }
}
?>