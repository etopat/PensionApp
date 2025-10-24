<?php
/**
 * ============================================================
 * LOGIN API
 * ============================================================
 * Authenticates users and starts session securely.
 * ============================================================
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit;
}

$email = trim($_POST['email'] ?? '');
$password = trim($_POST['password'] ?? '');

if ($email === '' || $password === '') {
    echo json_encode(['success' => false, 'message' => 'Missing email or password']);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT userId, userName, userRole, userPassword, userPhoto FROM tb_users WHERE userEmail = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        if (password_verify($password, $row['userPassword'])) {
            // ✅ Create secure session
            $_SESSION['userId'] = $row['userId'];
            $_SESSION['userName'] = $row['userName'];
            $_SESSION['userRole'] = $row['userRole'];
            $_SESSION['userPhoto'] = $row['userPhoto'] ?: '../uploads/profiles/default-user.png';
            $_SESSION['last_activity'] = time();

            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'userId' => $row['userId'],
                'userName' => $row['userName'],
                'userRole' => $row['userRole'],
                'userPhoto' => $row['userPhoto'] ?: '../uploads/profiles/default-user.png'
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Incorrect password']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'User not found']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

$stmt->close();
$conn->close();
?>
