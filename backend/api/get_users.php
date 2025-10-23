<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

try {
    $stmt = $conn->prepare("SELECT userId, userTitle, userName, userEmail, userRole, userPhoto FROM tb_users ORDER BY userName");
    $stmt->execute();
    $result = $stmt->get_result();
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = [
            'userId' => $row['userId'],
            'userTitle' => $row['userTitle'],
            'userName' => $row['userName'],
            'userEmail' => $row['userEmail'],
            'userRole' => $row['userRole'],
            'userPhoto' => $row['userPhoto'] ?: 'images/default-user.png'
        ];
    }
    
    echo json_encode([
        'success' => true,
        'users' => $users
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching users: ' . $e->getMessage()
    ]);
}

$stmt->close();
$conn->close();
?>