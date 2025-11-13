<?php
/**
 * ============================================================
 * get_system_status.php
 * Purpose: Get system status information for admin dashboard
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
    // Get last backup time
    $backupStmt = $conn->prepare("
        SELECT MAX(backup_time) as last_backup 
        FROM tb_backup_logs 
        WHERE backup_type = 'auto'
    ");
    $backupStmt->execute();
    $backupResult = $backupStmt->get_result();
    $lastBackup = $backupResult->fetch_assoc()['last_backup'];
    $backupStmt->close();

    // Get active users count (users with active sessions in last 15 minutes)
    $activeUsersStmt = $conn->prepare("
        SELECT COUNT(DISTINCT user_id) as active_users 
        FROM tb_user_logs 
        WHERE logout_time IS NULL 
        AND login_time >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    ");
    $activeUsersStmt->execute();
    $activeUsersResult = $activeUsersStmt->get_result();
    $activeUsers = $activeUsersResult->fetch_assoc()['active_users'];
    $activeUsersStmt->close();

    // Get system health status
    $healthStatus = 'healthy'; // Default to healthy
    
    // Check database connection health
    if (!$conn->ping()) {
        $healthStatus = 'error';
    } else {
        // Check for any system warnings (you can add more checks here)
        $warningStmt = $conn->prepare("
            SELECT COUNT(*) as warning_count 
            FROM tb_system_logs 
            WHERE log_level IN ('error', 'warning') 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        $warningStmt->execute();
        $warningResult = $warningStmt->get_result();
        $warningCount = $warningResult->fetch_assoc()['warning_count'];
        $warningStmt->close();
        
        if ($warningCount > 5) {
            $healthStatus = 'warning';
        }
    }

    echo json_encode([
        'success' => true,
        'lastBackup' => $lastBackup ? date('M j, Y g:i A', strtotime($lastBackup)) : 'Never',
        'activeUsers' => (int)$activeUsers,
        'systemHealth' => [
            'status' => $healthStatus,
            'message' => $healthStatus === 'healthy' ? 'All systems operational' : 
                        ($healthStatus === 'warning' ? 'System warnings detected' : 'System issues detected')
        ]
    ]);

} catch (Exception $e) {
    error_log("Error fetching system status: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching system status',
        'lastBackup' => 'Unknown',
        'activeUsers' => 0,
        'systemHealth' => [
            'status' => 'error',
            'message' => 'Unable to determine system status'
        ]
    ]);
}

$conn->close();
?>