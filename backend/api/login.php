<?php
/**
 * ============================================================
 * LOGIN API
 * ============================================================
 * Authenticates users using either Email or Phone Number.
 * - Accepts input in email or phone format.
 * - Checks both tb_users.userEmail and tb_users.phoneNo columns.
 * - Creates a secure PHP session on successful login.
 * - Returns user details as JSON.
 * ============================================================
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

// ------------------------------------------------------------
// 1️⃣ Validate Request Method
// ------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

// ------------------------------------------------------------
// 2️⃣ Get and Validate Input
// ------------------------------------------------------------
$username = trim($_POST['email'] ?? ''); // may be email or phone number
$password = trim($_POST['password'] ?? '');

if ($username === '' || $password === '') {
    echo json_encode(['success' => false, 'message' => 'Please enter your email/phone and password']);
    exit;
}

// ------------------------------------------------------------
// 3️⃣ Determine if Input is Email or Phone Number
// ------------------------------------------------------------
$isEmail = filter_var($username, FILTER_VALIDATE_EMAIL);
$isPhone = preg_match('/^\+[1-9][0-9]{7,14}$/', $username); // E.164 format e.g., +256700123456

if (!$isEmail && !$isPhone) {
    echo json_encode(['success' => false, 'message' => 'Enter a valid email or phone number (e.g., +256700123456)']);
    exit;
}

// ------------------------------------------------------------
// 4️⃣ Prepare SQL Query Based on Input Type
// ------------------------------------------------------------
try {
    if ($isEmail) {
        $stmt = $conn->prepare("
            SELECT userId, userName, userRole, userPassword, userPhoto, phoneNo 
            FROM tb_users 
            WHERE userEmail = ?
        ");
    } else {
        $stmt = $conn->prepare("
            SELECT userId, userName, userRole, userPassword, userPhoto, phoneNo 
            FROM tb_users 
            WHERE phoneNo = ?
        ");
    }

    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }

    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    // ------------------------------------------------------------
    // 5️⃣ Validate Credentials
    // ------------------------------------------------------------
    if ($row = $result->fetch_assoc()) {
        if (password_verify($password, $row['userPassword'])) {
            // ✅ Create secure session
            $_SESSION['userId'] = $row['userId'];
            $_SESSION['userName'] = $row['userName'];
            $_SESSION['userRole'] = $row['userRole'];
            $_SESSION['userPhoto'] = $row['userPhoto'] ?: '../uploads/profiles/default-user.png';
            $_SESSION['phoneNo'] = $row['phoneNo'];
            $_SESSION['last_activity'] = time();

            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'userId' => $row['userId'],
                'userName' => $row['userName'],
                'userRole' => $row['userRole'],
                'userPhoto' => $row['userPhoto'] ?: '../uploads/profiles/default-user.png',
                'phoneNo' => $row['phoneNo']
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Incorrect password']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'No user found with that email or phone number']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
} finally {
    if (isset($stmt) && $stmt instanceof mysqli_stmt) {
        $stmt->close();
    }
    $conn->close();
}
?>
