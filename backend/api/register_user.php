<?php
require_once '../config.php';

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Upload directory
$uploadDir = '../uploads/profiles/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    // Generate 4-character short reference code (e.g. A4F2)
    $shortCode = strtoupper(substr(base_convert(mt_rand(100000, 999999), 10, 36), 0, 4));

    // Hash the short code for secure storage
    $userId = hash("sha256", $shortCode);

    // Collect form inputs
    $userTitle = trim($_POST['userTitle']);
    $userName = trim($_POST['userName']);
    $userRole = trim($_POST['userRole']);
    $userEmail = trim($_POST['userEmail']);
    $passwordPlain = $_POST['userPassword'];
    $userPassword = password_hash($passwordPlain, PASSWORD_DEFAULT);
    $other = '';
    $photoPath = "";

    // Handle profile photo
    if (isset($_FILES['userPhoto']) && $_FILES['userPhoto']['error'] === UPLOAD_ERR_OK) {
        $fileTmp = $_FILES['userPhoto']['tmp_name'];
        $fileExt = strtolower(pathinfo($_FILES['userPhoto']['name'], PATHINFO_EXTENSION));
        $allowedExts = ['jpg', 'jpeg', 'png'];

        if (in_array($fileExt, $allowedExts)) {
            $newFileName = $shortCode . '.' . $fileExt;
            $targetPath = $uploadDir . $newFileName;

            list($width, $height, $type) = getimagesize($fileTmp);
            $maxWidth = 400;

            if ($width > $maxWidth) {
                $scale = $maxWidth / $width;
                $newWidth = $maxWidth;
                $newHeight = floor($height * $scale);
                $resizedImage = imagecreatetruecolor($newWidth, $newHeight);

                if ($fileExt === 'jpg' || $fileExt === 'jpeg') {
                    $source = imagecreatefromjpeg($fileTmp);
                    imagecopyresampled($resizedImage, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                    imagejpeg($resizedImage, $targetPath, 80);
                } elseif ($fileExt === 'png') {
                    $source = imagecreatefrompng($fileTmp);
                    imagecopyresampled($resizedImage, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                    imagepng($resizedImage, $targetPath, 6);
                }

                imagedestroy($resizedImage);
                imagedestroy($source);
            } else {
                move_uploaded_file($fileTmp, $targetPath);
            }

            $photoPath = $targetPath;
        }
    }

    // Insert into database
    $stmt = $conn->prepare("INSERT INTO tb_users (userId, userTitle, userName, userRole, userEmail, userPassword, userPhoto, other) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssssss", $userId, $userTitle, $userName, $userRole, $userEmail, $userPassword, $photoPath, $other);

    if ($stmt->execute()) {
        echo "<script>alert('User registered successfully. Reference Code: $shortCode'); window.location.href='../../frontend/register_user.html';</script>";
    } else {
        echo "<script>alert('Registration failed: " . $stmt->error . "'); history.back();</script>";
    }

    $stmt->close();
    $conn->close();
} else {
    header("Location: ../../frontend/register_user.html");
    exit();
}
