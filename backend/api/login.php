<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  echo json_encode(['success' => false, 'message' => 'Invalid request']);
  exit;
}

$email = trim($_POST['email'] ?? '');
$password = trim($_POST['password'] ?? '');

if ($email === '' || $password === '') {
  echo json_encode(['success' => false, 'message' => 'Missing fields']);
  exit;
}

$stmt = $conn->prepare("SELECT userId, userName, userRole, userPassword FROM tb_users WHERE userEmail = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
  if (password_verify($password, $row['userPassword'])) {
    echo json_encode([
      'success' => true,
      'message' => 'Login successful',
      'userName' => $row['userName'],
      'userRole' => $row['userRole']
    ]);
  } else {
    echo json_encode(['success' => false, 'message' => 'Incorrect password']);
  }
} else {
  echo json_encode(['success' => false, 'message' => 'User not found']);
}

$stmt->close();
$conn->close();
