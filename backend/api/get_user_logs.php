<?php
/**
 * ============================================================
 * get_user_logs.php
 * Purpose: Fetch user activity logs for admin dashboard
 * Access: Admin only
 * ============================================================
 */

// Start session and set headers first
session_start();
header('Content-Type: application/json');

// Prevent any output before JSON
ob_start();

try {
    require_once __DIR__ . '/../config.php';
    
    // Verify admin access
    if (!isset($_SESSION['userId']) || $_SESSION['userRole'] !== 'admin') {
        throw new Exception('Admin access required');
    }

    // Get pagination parameters with validation
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 50;
    $offset = ($page - 1) * $limit;

    // Get filter parameters with sanitization
    $activityType = isset($_GET['activity_type']) ? trim($_GET['activity_type']) : '';
    $userId = isset($_GET['user_id']) ? trim($_GET['user_id']) : '';
    $dateFrom = isset($_GET['date_from']) ? trim($_GET['date_from']) : '';
    $dateTo = isset($_GET['date_to']) ? trim($_GET['date_to']) : '';

    // Build query with filters
    $query = "
        SELECT 
            ul.log_id,
            ul.user_id,
            ul.user_name,
            ul.user_role,
            ul.activity_type,
            ul.ip_address,
            ul.device_type,
            ul.location,
            ul.session_id,
            ul.login_time,
            ul.logout_time,
            ul.duration_seconds,
            ul.details,
            ul.created_at
        FROM tb_user_logs ul
        WHERE 1=1
    ";

    $params = [];
    $types = '';

    // Apply filters
    if (!empty($activityType)) {
        $query .= " AND ul.activity_type = ?";
        $params[] = $activityType;
        $types .= 's';
    }

    if (!empty($userId)) {
        $query .= " AND ul.user_id = ?";
        $params[] = $userId;
        $types .= 's';
    }

    if (!empty($dateFrom)) {
        $query .= " AND DATE(ul.created_at) >= ?";
        $params[] = $dateFrom;
        $types .= 's';
    }

    if (!empty($dateTo)) {
        $query .= " AND DATE(ul.created_at) <= ?";
        $params[] = $dateTo;
        $types .= 's';
    }

    // Count total records
    $countQuery = "SELECT COUNT(*) as total FROM ($query) as filtered";
    
    if (!empty($params)) {
        $countStmt = $conn->prepare($countQuery);
        if ($countStmt === false) {
            throw new Exception('Failed to prepare count query: ' . $conn->error);
        }
        $countStmt->bind_param($types, ...$params);
        $countStmt->execute();
        $countResult = $countStmt->get_result();
        $totalRecords = $countResult->fetch_assoc()['total'];
        $countStmt->close();
    } else {
        $countResult = $conn->query($countQuery);
        if ($countResult === false) {
            throw new Exception('Failed to execute count query: ' . $conn->error);
        }
        $totalRecords = $countResult->fetch_assoc()['total'];
    }

    // Get paginated results
    $query .= " ORDER BY ul.created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= 'ii';

    $stmt = $conn->prepare($query);
    if ($stmt === false) {
        throw new Exception('Failed to prepare query: ' . $conn->error);
    }

    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }

    if (!$stmt->execute()) {
        throw new Exception('Failed to execute query: ' . $stmt->error);
    }

    $result = $stmt->get_result();
    $logs = [];

    while ($row = $result->fetch_assoc()) {
        $logs[] = [
            'log_id' => $row['log_id'],
            'user_id' => $row['user_id'],
            'user_name' => $row['user_name'],
            'user_role' => $row['user_role'],
            'activity_type' => $row['activity_type'],
            'ip_address' => $row['ip_address'],
            'device_type' => $row['device_type'],
            'location' => $row['location'],
            'session_id' => $row['session_id'],
            'login_time' => $row['login_time'],
            'logout_time' => $row['logout_time'],
            'duration_seconds' => $row['duration_seconds'],
            'duration_formatted' => formatDuration($row['duration_seconds']),
            'details' => $row['details'],
            'created_at' => $row['created_at'],
            'created_date' => date('M j, Y g:i A', strtotime($row['created_at']))
        ];
    }

    $stmt->close();

    // Clear any unexpected output
    ob_clean();
    
    echo json_encode([
        'success' => true,
        'logs' => $logs,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total_records' => $totalRecords,
            'total_pages' => ceil($totalRecords / $limit)
        ],
        'filters' => [
            'activity_type' => $activityType,
            'user_id' => $userId,
            'date_from' => $dateFrom,
            'date_to' => $dateTo
        ]
    ]);

} catch (Exception $e) {
    // Clear any output and send error
    ob_clean();
    error_log("Error fetching user logs: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching user logs: ' . $e->getMessage()
    ]);
} finally {
    // Ensure connection is closed
    if (isset($conn)) {
        $conn->close();
    }
    // End output buffering
    ob_end_flush();
}

// Helper function to format duration
function formatDuration($seconds) {
    if ($seconds === null || $seconds === '') {
        return 'N/A';
    }
    
    $seconds = (int)$seconds;
    if ($seconds < 60) {
        return "$seconds seconds";
    } elseif ($seconds < 3600) {
        $minutes = floor($seconds / 60);
        return "$minutes minutes";
    } else {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        return "$hours hours, $minutes minutes";
    }
}
?>