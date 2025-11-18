<?php
/**
 * Get User Settings
 * Returns user settings including theme preference and notification settings
 */

session_start();
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $user_id = $_SESSION['user_id'];
    
    // Try to get user settings from database (including optional columns)
    try {
        $query = "SELECT 
                    id,
                    CONCAT(first_name, ' ', last_name) as full_name,
                    email,
                    theme_preference,
                    task_reminders,
                    created_at
                  FROM users 
                  WHERE id = :user_id AND is_active = 1";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            // Set defaults if columns don't exist
            if (!isset($user['theme_preference'])) {
                $user['theme_preference'] = 'light';
            }
            if (!isset($user['task_reminders'])) {
                $user['task_reminders'] = 1;
            }
            
            echo json_encode([
                'success' => true,
                'user' => $user
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'User not found']);
        }
    } catch (PDOException $e) {
        // If theme_preference or task_reminders columns don't exist, try without them
        if (strpos($e->getMessage(), 'Unknown column') !== false) {
            $query = "SELECT 
                        id,
                        CONCAT(first_name, ' ', last_name) as full_name,
                        email,
                        created_at
                      FROM users 
                      WHERE id = :user_id AND is_active = 1";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':user_id', $user_id);
            $stmt->execute();
            
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                // Set default values
                $user['theme_preference'] = 'light';
                $user['task_reminders'] = 1;
                
                echo json_encode([
                    'success' => true,
                    'user' => $user,
                    'note' => 'Using default settings. Consider adding theme_preference and task_reminders columns.'
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'User not found']);
            }
        } else {
            throw $e;
        }
    }
    
} catch (Exception $e) {
    error_log("Get user settings error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while retrieving user settings: ' . $e->getMessage()
    ]);
}
?>