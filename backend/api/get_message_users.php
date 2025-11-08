<?php
// ============================================================================
// get_message_users.php
// Purpose: Fetch users for messaging (excluding pensioners)
// ============================================================================

require_once __DIR__ . '/../config.php';

if (!isset($_SESSION['userId'])) {
    header('HTTP/1.1 401 Unauthorized');
    echo json_encode(['success' => false, 'message' => 'Session expired']);
    exit;
}

header('Content-Type: application/json');

try {
    // Prepare and execute the SQL statement - exclude pensioners
    $stmt = $conn->prepare("
        SELECT 
            userId, 
            userTitle, 
            userName, 
            userEmail, 
            phoneNo,
            userRole, 
            userPhoto 
        FROM tb_users 
        WHERE userRole != 'pensioner'
        AND userId != ?
        ORDER BY userName
    ");
    $stmt->bind_param("s", $_SESSION['userId']);
    $stmt->execute();
    $result = $stmt->get_result();

    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = [
            'userId'      => $row['userId'],
            'userTitle'   => $row['userTitle'],
            'userName'    => $row['userName'],
            'userEmail'   => $row['userEmail'],
            'phoneNo'     => $row['phoneNo'] ?? '',
            'userRole'    => $row['userRole'],
            'userPhoto'   => $row['userPhoto'] ?: 'images/default-user.png'
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

$conn->close();
?>