<?php
/**
 * Update Password
 * Handles password change requests from settings page
 */

session_start();
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $user_id = $_SESSION['user_id'];
    
    // Get POST data
    $current_password = trim($_POST['current_password'] ?? '');
    $new_password = trim($_POST['new_password'] ?? '');
    $confirm_password = trim($_POST['confirm_password'] ?? '');
    
    // Validate input
    if (empty($current_password) || empty($new_password) || empty($confirm_password)) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit;
    }
    
    // Check if passwords match
    if ($new_password !== $confirm_password) {
        echo json_encode(['success' => false, 'message' => 'New passwords do not match']);
        exit;
    }
    
    // Validate password length
    if (strlen($new_password) < 8) {
        echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long']);
        exit;
    }
    
    // Password strength validation
    $has_uppercase = preg_match('/[A-Z]/', $new_password);
    $has_lowercase = preg_match('/[a-z]/', $new_password);
    $has_number = preg_match('/[0-9]/', $new_password);
    
    if (!$has_uppercase || !$has_lowercase || !$has_number) {
        echo json_encode([
            'success' => false,
            'message' => 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ]);
        exit;
    }
    
    // Get current password hash from database
    $query = "SELECT password_hash FROM users WHERE id = :user_id AND is_active = 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }
    
    // Verify current password
    if (!password_verify($current_password, $user['password_hash'])) {
        echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
        exit;
    }
    
    // Check if new password is the same as current
    if (password_verify($new_password, $user['password_hash'])) {
        echo json_encode(['success' => false, 'message' => 'New password must be different from current password']);
        exit;
    }
    
    // Hash new password
    $new_password_hash = password_hash($new_password, PASSWORD_DEFAULT);
    
    // Update password in database
    $update_query = "UPDATE users 
                     SET password_hash = :password_hash, 
                         updated_at = CURRENT_TIMESTAMP 
                     WHERE id = :user_id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':password_hash', $new_password_hash);
    $update_stmt->bindParam(':user_id', $user_id);
    
    if ($update_stmt->execute()) {
        // Log password change
        error_log("Password changed successfully for user ID: " . $user_id);
        
        echo json_encode([
            'success' => true,
            'message' => 'Password updated successfully'
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update password']);
    }
    
} catch (Exception $e) {
    error_log("Password update error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while updating password'
    ]);
}
?>