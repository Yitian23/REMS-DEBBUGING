<?php
/**
 * Update User Settings
 * Handles notification and appearance settings updates
 */

session_start();
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

// Check authentication
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
    $setting_type = $_POST['setting_type'] ?? '';
    
    if ($setting_type === 'notifications') {
        // Handle notification settings
        $task_reminders = isset($_POST['task_reminders']) ? 1 : 0;
        
        // Update user settings (you may need to add these columns to users table)
        $query = "UPDATE users 
                  SET task_reminders = :task_reminders,
                      updated_at = CURRENT_TIMESTAMP 
                  WHERE id = :user_id";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':task_reminders', $task_reminders);
        $stmt->bindParam(':user_id', $user_id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Notification settings updated successfully'
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update settings']);
        }
        
    } elseif ($setting_type === 'appearance') {
        // Handle appearance settings
        $theme = $_POST['theme'] ?? 'light';
        
        // Validate theme
        if (!in_array($theme, ['light', 'dark'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid theme']);
            exit;
        }
        
        // Update user theme preference (you may need to add this column to users table)
        $query = "UPDATE users 
                  SET theme_preference = :theme,
                      updated_at = CURRENT_TIMESTAMP 
                  WHERE id = :user_id";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':theme', $theme);
        $stmt->bindParam(':user_id', $user_id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Appearance settings updated successfully',
                'theme' => $theme
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update settings']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid setting type']);
    }
    
} catch (Exception $e) {
    error_log("Settings update error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while updating settings'
    ]);
}
?>