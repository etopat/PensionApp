<?php
/**
 * ============================================================
 * get_logs_summary.php
 * Purpose: Get summary statistics for user logs
 * Access: Admin only
 * ============================================================
 */

session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

// Verify admin access
if (!isset($_SESSION['userId']) || $_SESSION['userRole'] !== 'admin') {
    echo json_encode([
        'success' => false,
        'message' => 'Admin access required'
    ]);
    exit;
}

try {
    // Get date range (default to last 30 days)
    $days = isset($_GET['days']) ? (int)$_GET['days'] : 30;
    $startDate = date('Y-m-d', strtotime("-$days days"));

    // Total logs count
    $totalStmt = $conn->prepare("
        SELECT COUNT(*) as total_logs 
        FROM tb_user_logs 
        WHERE created_at >= ?
    ");
    $totalStmt->bind_param("s", $startDate);
    $totalStmt->execute();
    $totalResult = $totalStmt->get_result();
    $totalLogs = $totalResult->fetch_assoc()['total_logs'];
    $totalStmt->close();

    // Logs by activity type
    $typeStmt = $conn->prepare("
        SELECT 
            activity_type,
            COUNT(*) as count
        FROM tb_user_logs 
        WHERE created_at >= ?
        GROUP BY activity_type 
        ORDER BY count DESC
    ");
    $typeStmt->bind_param("s", $startDate);
    $typeStmt->execute();
    $typeResult = $typeStmt->get_result();

    $logsByType = [];
    while ($row = $typeResult->fetch_assoc()) {
        $logsByType[] = $row;
    }
    $typeStmt->close();

    // Logs by user role
    $roleStmt = $conn->prepare("
        SELECT 
            user_role,
            COUNT(*) as count
        FROM tb_user_logs 
        WHERE created_at >= ?
        GROUP BY user_role 
        ORDER BY count DESC
    ");
    $roleStmt->bind_param("s", $startDate);
    $roleStmt->execute();
    $roleResult = $roleStmt->get_result();

    $logsByRole = [];
    while ($row = $roleResult->fetch_assoc()) {
        $logsByRole[] = $row;
    }
    $roleStmt->close();

    // Today's activity
    $todayStmt = $conn->prepare("
        SELECT 
            COUNT(*) as today_logs,
            COUNT(DISTINCT user_id) as active_users
        FROM tb_user_logs 
        WHERE DATE(created_at) = CURDATE()
    ");
    $todayStmt->execute();
    $todayResult = $todayStmt->get_result();
    $todayData = $todayResult->fetch_assoc();
    $todayStmt->close();

    // Failed login attempts (last 7 days)
    $failedStmt = $conn->prepare("
        SELECT COUNT(*) as failed_logins
        FROM tb_user_logs 
        WHERE activity_type = 'login' 
        AND details LIKE '%Failed login%'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $failedStmt->execute();
    $failedResult = $failedStmt->get_result();
    $failedLogins = $failedResult->fetch_assoc()['failed_logins'];
    $failedStmt->close();

    echo json_encode([
        'success' => true,
        'summary' => [
            'total_logs' => (int)$totalLogs,
            'today_logs' => (int)$todayData['today_logs'],
            'active_users_today' => (int)$todayData['active_users'],
            'failed_logins_week' => (int)$failedLogins,
            'date_range_days' => $days
        ],
        'by_activity_type' => $logsByType,
        'by_user_role' => $logsByRole
    ]);

} catch (Exception $e) {
    error_log("Error fetching logs summary: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching logs summary: ' . $e->getMessage()
    ]);
}

$conn->close();
?>