<?php 
// backend/config.php 
// // Database credentials 
define('DB_HOST', 'localhost'); 
define('DB_NAME', 'pension_db'); 
define('DB_USER', 'root'); 
define('DB_PASS', ''); 
// Set options for PDO 
$options = [ PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
// Enable exceptions 
PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
// Fetch as associative arrays 
PDO::ATTR_EMULATE_PREPARES => false,
// Use real prepared statements 
]; 
try { 
// Create PDO instance 
$pdo = new PDO( "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
DB_USER, DB_PASS, $options ); 
} 
catch (PDOException $e) { 
// Handle connection error 
http_response_code(500);
echo json_encode(['error' => 'Database connection failed.']);
exit;
}
?>