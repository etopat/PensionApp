<?php
/**
 * ============================================================
 * CONFIGURATION FILE
 * ============================================================
 * - Establishes MySQL connection
 * - Manages secure PHP sessions
 * - Implements session timeout (auto logout after inactivity)
 * - Sets cache prevention headers for sensitive content
 * ============================================================
 */

$host = "localhost";
$user = "root";
$password = ""; // Update if needed
$database = "pension_db";

// ------------------------------------------------------------
// 1️⃣ Database Connection
// ------------------------------------------------------------
$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    die(json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $conn->connect_error
    ]));
}

// ------------------------------------------------------------
// 2️⃣ Secure Session Initialization
// ------------------------------------------------------------
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Session timeout in seconds (e.g. 30 minutes)
$timeout_duration = 1800;

// ------------------------------------------------------------
// 3️⃣ Session Expiration Handling
// ------------------------------------------------------------
if (isset($_SESSION['last_activity'])) {
    $elapsed = time() - $_SESSION['last_activity'];
    if ($elapsed > $timeout_duration) {
        session_unset();
        session_destroy();

        // Prevent further execution if session expired
        if (php_sapi_name() !== 'cli') {
            header("Location: ../../frontend/login.html?expired=1");
            exit();
        }
    }
}
$_SESSION['last_activity'] = time();

// ------------------------------------------------------------
// 4️⃣ Cache Prevention Headers
// ------------------------------------------------------------
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
?>
