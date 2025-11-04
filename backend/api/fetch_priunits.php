<?php
/**
 * Fetch all prison units from tb_priunits
 * Returns JSON list for dropdown select
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

try {
    $sql = "SELECT priUnit FROM tb_priunits ORDER BY priUnit ASC";
    $result = $conn->query($sql);

    $units = [];
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $units[] = $row['priUnit'];
        }
    }

    echo json_encode(['success' => true, 'units' => $units], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

$conn->close();
?>
