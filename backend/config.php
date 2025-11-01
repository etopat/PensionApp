<?php
/**
 * ============================================================
 * CONFIGURATION FILE (Safe Version)
 * ============================================================
 * - Establishes MySQL connection
 * - Manages secure PHP sessions
 * - Implements session timeout (auto logout after inactivity)
 * - Prevents cache and stale browser history
 * ============================================================
 */

// ------------------------------------------------------------
// 1️⃣ Database Connection
// ------------------------------------------------------------
$host = "localhost";
$user = "root";
$password = "";
$database = "pension_db";

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
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// ------------------------------------------------------------
// 3️⃣ Session Timeout Handling
// ------------------------------------------------------------
$timeout_duration = 1800; // 30 minutes

if (isset($_SESSION['last_activity'])) {
    $elapsed = time() - $_SESSION['last_activity'];
    if ($elapsed > $timeout_duration) {
        session_unset();
        session_destroy();

        // Detect if this is an AJAX/API call
        $isApi = isset($_SERVER['HTTP_X_REQUESTED_WITH']) || 
                 strpos($_SERVER['SCRIPT_NAME'], '/api/') !== false ||
                 strpos($_SERVER['PHP_SELF'], '/api/') !== false;

        if ($isApi) {
            // ✅ Return JSON for API calls
            echo json_encode(['active' => false, 'message' => 'Session expired']);
            exit;
        } else {
            // ✅ Redirect only for normal page loads
            header("Location: ../../frontend/login.html?expired=1");
            exit;
        }
    }
}

// Update session activity timestamp
$_SESSION['last_activity'] = time();

// ------------------------------------------------------------
// 4️⃣ Cache Prevention Headers
// ------------------------------------------------------------
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

// ------------------------------------------------------------
// 5️⃣ Optional Security Headers
// ------------------------------------------------------------
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("X-XSS-Protection: 1; mode=block");
?>
