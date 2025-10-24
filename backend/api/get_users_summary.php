<?php
// backend/api/get_users_summary.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include your existing config file
require_once '../config.php';

try {
    // Check if user is logged in using your existing session validation
    if (!isset($_SESSION['user_id']) && !isset($_SESSION['last_activity'])) {
        echo json_encode([
            'success' => false, 
            'message' => 'Unauthorized access. Please log in.',
            'redirect' => '../../frontend/login.html?expired=1'
        ]);
        exit();
    }

    // Query to get user counts by role from tb_users table
    $sql = "
        SELECT 
            userRole as role,
            COUNT(*) as count
        FROM tb_users 
        GROUP BY userRole 
        ORDER BY 
            FIELD(userRole, 'admin', 'clerk', 'oc_pen', 'writeup_officer', 'file_creator', 'data_entry', 'assessor', 'auditor', 'approver', 'user', 'pensioner'),
            count DESC
    ";

    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }

    if (empty($users)) {
        // If no users found, return empty array with success
        echo json_encode([
            'success' => true,
            'users' => [],
            'total_users' => 0,
            'message' => 'No users found in the database'
        ]);
        exit();
    }

    // Format the response and calculate total
    $formattedUsers = [];
    $totalUsers = 0;
    
    foreach ($users as $user) {
        $count = (int)$user['count'];
        $formattedUsers[] = [
            'role' => $user['role'],
            'count' => $count
        ];
        $totalUsers += $count;
    }

    // Successful response
    $response = [
        'success' => true,
        'users' => $formattedUsers,
        'total_users' => $totalUsers,
        'table_used' => 'tb_users',
        'query_info' => [
            'users_found' => count($formattedUsers),
            'roles_found' => array_column($formattedUsers, 'role')
        ]
    ];

    echo json_encode($response);

} catch (Exception $e) {
    error_log("Error in get_users_summary.php: " . $e->getMessage());
    
    $error_response = [
        'success' => false, 
        'message' => $e->getMessage(),
        'suggestion' => 'Check if tb_users table exists and has data'
    ];
    
    echo json_encode($error_response);
}

// Close connection
if (isset($conn)) {
    $conn->close();
}
?>