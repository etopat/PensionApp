<?php
// ============================================================================
// send_message.php
// Admin-only broadcast, exclude sender from recipients, security validation
// Support for custom file names and enhanced recipient handling
// ============================================================================

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../config.php';

// Set header first to ensure JSON response
header('Content-Type: application/json');

if (!isset($_SESSION['userId'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Session expired']);
    exit;
}

function handleFileUpload($file, $messageId, $conn, $customName = null) {
    // Check if file upload exists and has no errors
    if (!isset($file['name']) || empty($file['name']) || $file['error'] !== UPLOAD_ERR_OK) {
        return false;
    }
    
    $uploadDir = __DIR__ . '/../uploads/messages/';
    
    // Create uploads directory if it doesn't exist
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            throw new Exception("Failed to create upload directory");
        }
    }

    // Security: sanitize filename
    $originalName = basename($file['name']);
    $safeName = preg_replace('/[^a-zA-Z0-9\._-]/', '_', $originalName);
    $fileName = time() . '_' . $safeName;
    $filePath = $uploadDir . $fileName;
    
    // Use custom name if provided, otherwise use original name
    $displayName = $customName ?: $originalName;
    
    // Basic file type validation
    $allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 
        'application/pdf', 
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip',
        'application/x-zip-compressed'
    ];
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, $allowedTypes)) {
        throw new Exception("File type not allowed: " . $mimeType);
    }

    // Check file size (max 10MB)
    if ($file['size'] > 10 * 1024 * 1024) {
        throw new Exception("File size too large. Maximum 10MB allowed.");
    }

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception("Failed to move uploaded file");
    }

    // Insert into database
    $stmt = $conn->prepare("
        INSERT INTO tb_message_attachments 
        (message_id, file_name, file_path, file_size, mime_type) 
        VALUES (?, ?, ?, ?, ?)
    ");
    
    if (!$stmt) {
        unlink($filePath);
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $relativePath = 'uploads/messages/' . $fileName;
    $stmt->bind_param("issis", $messageId, $displayName, $relativePath, $file['size'], $mimeType);
    
    if (!$stmt->execute()) {
        unlink($filePath);
        throw new Exception("Failed to save attachment to database: " . $stmt->error);
    }
    
    return true;
}

try {
    $userId = $_SESSION['userId'];
    $userRole = $_SESSION['userRole'] ?? '';
    
    // Determine input method
    $messageData = [];
    $fileNames = [];
    
    // Check if it's multipart form data (with files)
    if (!empty($_FILES)) {
        // Form data with potential files
        if (isset($_POST['data'])) {
            $rawData = $_POST['data'];
            $messageData = json_decode($rawData, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Invalid JSON data in form: " . json_last_error_msg());
            }
            
            // Get custom file names if provided
            if (isset($messageData['fileNames'])) {
                $fileNames = $messageData['fileNames'];
            }
        } else {
            throw new Exception("No message data found in form");
        }
    } else {
        // Regular JSON request (no files)
        $jsonInput = file_get_contents('php://input');
        
        if (empty($jsonInput)) {
            throw new Exception("No data received. Please check your request format.");
        }
        
        $messageData = json_decode($jsonInput, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON input: " . json_last_error_msg());
        }
    }

    if (empty($messageData)) {
        throw new Exception("No message data received");
    }

    // Extract and validate data
    $subject = trim($messageData['subject'] ?? '');
    $messageText = trim($messageData['message'] ?? '');
    $recipients = $messageData['recipients'] ?? [];
    $isUrgent = filter_var($messageData['isUrgent'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $isBroadcast = filter_var($messageData['isBroadcast'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $targetRoles = $messageData['targetRoles'] ?? [];
    $messageType = $isBroadcast ? 'broadcast' : ($messageData['messageType'] ?? 'direct');

    // Validation
    if (empty($subject)) {
        throw new Exception("Subject is required");
    }
    
    if (empty($messageText)) {
        throw new Exception("Message text is required");
    }

    if (strlen($subject) > 255) {
        throw new Exception("Subject is too long (max 255 characters)");
    }

    // Broadcast permissions validation
    if ($isBroadcast) {
        if ($userRole !== 'admin') {
            throw new Exception("Only administrators can send broadcast messages");
        }
        
        // For broadcasts, we'll send to all users except the sender
        $recipients = []; // Clear individual recipients for broadcast
    } else {
        // For direct/group messages, validate recipients
        if (empty($recipients)) {
            throw new Exception("Please select at least one recipient.");
        }
        
        // Filter out sender from recipients to prevent self-messaging
        $recipients = array_filter($recipients, function($recipientId) use ($userId) {
            return $recipientId !== $userId;
        });
        
        if (empty($recipients)) {
            throw new Exception("Cannot send message to yourself. Please select other recipients.");
        }
    }

    // Check storage limit before sending
    $storageCheckStmt = $conn->prepare("
        SELECT COALESCE(SUM(att.file_size), 0) as current_usage
        FROM tb_message_attachments att
        INNER JOIN tb_messages m ON att.message_id = m.message_id
        WHERE m.sender_id = ?
        AND (m.is_deleted_by_sender = FALSE OR m.is_deleted_by_sender IS NULL)
    ");
    $storageCheckStmt->bind_param("s", $userId);
    $storageCheckStmt->execute();
    $storageResult = $storageCheckStmt->get_result();
    $storageData = $storageResult->fetch_assoc();
    $storageCheckStmt->close();

    $currentUsage = $storageData['current_usage'] ?? 0;
    $maxStorage = 100 * 1024 * 1024; // 300MB

    // Calculate new attachments size if any
    $newAttachmentsSize = 0;
    if (!empty($_FILES['attachments'])) {
        $attachments = $_FILES['attachments'];
        if (is_array($attachments['name'])) {
            for ($i = 0; $i < count($attachments['name']); $i++) {
                if ($attachments['error'][$i] === UPLOAD_ERR_OK) {
                    $newAttachmentsSize += $attachments['size'][$i];
                }
            }
        } else {
            if ($attachments['error'] === UPLOAD_ERR_OK) {
                $newAttachmentsSize += $attachments['size'];
            }
        }
    }

    // Check if new message would exceed storage limit
    if (($currentUsage + $newAttachmentsSize) > $maxStorage) {
        $remainingMB = round(($maxStorage - $currentUsage) / (1024 * 1024), 2);
        throw new Exception("Storage limit exceeded. You have {$remainingMB}MB remaining. Please delete some messages or attachments.");
    }

    // Start transaction
    $conn->begin_transaction();

    try {
        // Insert main message
        $stmt = $conn->prepare("
            INSERT INTO tb_messages 
            (sender_id, subject, message_text, message_type, is_urgent) 
            VALUES (?, ?, ?, ?, ?)
        ");
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param("ssssi", $userId, $subject, $messageText, $messageType, $isUrgent);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to create message: " . $stmt->error);
        }

        $messageId = $conn->insert_id;

        // Handle broadcast
        if ($isBroadcast) {
            $broadcastStmt = $conn->prepare("
                INSERT INTO tb_broadcast_messages (message_id, target_roles) 
                VALUES (?, ?)
            ");
            
            if (!$broadcastStmt) {
                throw new Exception("Prepare broadcast failed: " . $conn->error);
            }
            
            $targetRolesJson = !empty($targetRoles) ? json_encode($targetRoles) : null;
            $broadcastStmt->bind_param("is", $messageId, $targetRolesJson);
            
            if (!$broadcastStmt->execute()) {
                throw new Exception("Failed to create broadcast: " . $broadcastStmt->error);
            }
            
            // For broadcasts, get all users except sender and add as recipients
            $getUsersStmt = $conn->prepare("
                SELECT userId FROM tb_users 
                WHERE userId != ? AND userRole != 'pensioner'
            ");
            $getUsersStmt->bind_param("s", $userId);
            $getUsersStmt->execute();
            $usersResult = $getUsersStmt->get_result();
            
            $recipientStmt = $conn->prepare("
                INSERT INTO tb_message_recipients (message_id, recipient_user_id) 
                VALUES (?, ?)
            ");
            
            while ($user = $usersResult->fetch_assoc()) {
                // Apply role filtering if specific roles are selected
                if (!empty($targetRoles)) {
                    $userRoleStmt = $conn->prepare("SELECT userRole FROM tb_users WHERE userId = ?");
                    $userRoleStmt->bind_param("s", $user['userId']);
                    $userRoleStmt->execute();
                    $userRoleResult = $userRoleStmt->get_result();
                    $userData = $userRoleResult->fetch_assoc();
                    $userRoleStmt->close();
                    
                    if ($userData && in_array($userData['userRole'], $targetRoles)) {
                        $recipientStmt->bind_param("is", $messageId, $user['userId']);
                        $recipientStmt->execute();
                    }
                } else {
                    // No role filtering, send to all non-pensioner users
                    $recipientStmt->bind_param("is", $messageId, $user['userId']);
                    $recipientStmt->execute();
                }
            }
            
            $getUsersStmt->close();
            $recipientStmt->close();
            
        } else {
            // Handle recipients for direct/group messages
            if (!empty($recipients)) {
                $recipientStmt = $conn->prepare("
                    INSERT INTO tb_message_recipients (message_id, recipient_user_id) 
                    VALUES (?, ?)
                ");
                
                if (!$recipientStmt) {
                    throw new Exception("Prepare recipient failed: " . $conn->error);
                }
                
                foreach ($recipients as $recipientId) {
                    if (empty($recipientId) || !is_string($recipientId)) {
                        continue;
                    }
                    
                    // Double-check we're not sending to self
                    if ($recipientId === $userId) {
                        continue;
                    }
                    
                    $recipientStmt->bind_param("is", $messageId, $recipientId);
                    
                    if (!$recipientStmt->execute()) {
                        error_log("Failed to add recipient $recipientId: " . $recipientStmt->error);
                    }
                }
            }
        }

        // Handle file attachments with custom names
        if (!empty($_FILES['attachments'])) {
            $attachments = $_FILES['attachments'];
            $attachmentNames = $_POST['attachment_names'] ?? [];
            
            if (is_array($attachments['name'])) {
                for ($i = 0; $i < count($attachments['name']); $i++) {
                    if ($attachments['error'][$i] === UPLOAD_ERR_OK) {
                        $file = [
                            'name' => $attachments['name'][$i],
                            'type' => $attachments['type'][$i],
                            'tmp_name' => $attachments['tmp_name'][$i],
                            'error' => $attachments['error'][$i],
                            'size' => $attachments['size'][$i]
                        ];
                        
                        // Get custom name if available
                        $customName = $attachmentNames[$i] ?? null;
                        handleFileUpload($file, $messageId, $conn, $customName);
                    }
                }
            } else {
                if ($attachments['error'] === UPLOAD_ERR_OK) {
                    $customName = $attachmentNames[0] ?? null;
                    handleFileUpload($attachments, $messageId, $conn, $customName);
                }
            }
        }

        // Commit transaction
        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Message sent successfully',
            'message_id' => $messageId
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log("Send message error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

if (isset($conn)) {
    $conn->close();
}
?>