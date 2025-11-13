<?php
/**
 * log_security_event.php
 * Simple security event logger
 */

session_start();
header('Content-Type: application/json');

// Get the input data
$input = json_decode(file_get_contents('php://input'), true);

// Log to file (create the directory if it doesn't exist)
$logDir = __DIR__ . '/../logs/';
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}

$logMessage = sprintf(
    "[%s] %s: %s (User: %s, IP: %s)\n",
    date('Y-m-d H:i:s'),
    $input['event_type'] ?? 'unknown',
    $input['description'] ?? 'no description',
    $_SESSION['userId'] ?? 'unknown',
    $_SERVER['REMOTE_ADDR'] ?? 'unknown'
);

file_put_contents($logDir . 'security.log', $logMessage, FILE_APPEND | LOCK_EX);

// Simple response
echo json_encode(['success' => true]);
?>