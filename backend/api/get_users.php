<?php
// ============================================================================
// get_users.php
// Purpose: Fetch all registered users from the database with session validation
// Author: Patrick
// ============================================================================

// Include config and start session
require_once __DIR__ . '/../config.php';

// Ensure user is logged in before fetching users
if (!isset($_SESSION['userId'])) {
    header('HTTP/1.1 401 Unauthorized');
    echo json_encode(['success' => false, 'message' => 'Session expired or unauthorized access']);
    exit;
}

header('Content-Type: application/json');

try {
    // Prepare and execute the SQL statement
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
        ORDER BY userName
    ");
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

// Cleanup
if (isset($stmt)) $stmt->close();
$conn->close();
?>
