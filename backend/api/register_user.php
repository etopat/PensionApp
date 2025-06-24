<?php
require_once '../config.php';

$uploadDir = '../uploads/profiles/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $userId = $_POST['userId'];
    $userTitle = $_POST['userTitle'];
    $userName = $_POST['userName'];
    $userRole = $_POST['userRole'];
    $userEmail = $_POST['userEmail'];
    $passwordPlain = $_POST['userPassword'];
    $other = '';

    // Hash password
    $userPassword = password_hash($passwordPlain, PASSWORD_DEFAULT);

    // Handle profile photo
    $photoPath = "";
    if (isset($_FILES['userPhoto']) && $_FILES['userPhoto']['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($_FILES['userPhoto']['name'], PATHINFO_EXTENSION);
        $filename = $userId . '.' . strtolower($ext);
        $targetPath = $uploadDir . $filename;

        if (move_uploaded_file($_FILES['userPhoto']['tmp_name'], $targetPath)) {
            $photoPath = $targetPath;
        }
    }

    // Insert into database
    $stmt = $conn->prepare("INSERT INTO tb_users (userId, userTitle, userName, userRole, userEmail, userPassword, userPhoto, other) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssssss", $userId, $userTitle, $userName, $userRole, $userEmail, $userPassword, $photoPath, $other);

    if ($stmt->execute()) {
        echo "<script>alert('User registered successfully.'); window.location.href='../../frontend/register_user.html';</script>";
    } else {
        echo "<script>alert('Registration failed: " . $stmt->error . "'); history.back();</script>";
    }

    $stmt->close();
    $conn->close();
} else {
    header("Location: ../../frontend/register_user.html");
    exit();
}
