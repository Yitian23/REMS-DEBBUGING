<?php
session_start();
require_once __DIR__ . '/../config/database.php';

// Check if user is logged in
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $user_id = $_SESSION['user_id'];
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    $task_id = $input['task_id'] ?? null;
    
    if (!$task_id) {
        echo json_encode(['success' => false, 'message' => 'Task ID is required']);
        exit;
    }
    
    // Check if task belongs to current user
    $check_query = "SELECT id FROM tasks WHERE id = :task_id AND user_id = :user_id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':task_id', $task_id);
    $check_stmt->bindParam(':user_id', $user_id);  
    $check_stmt->execute();

    if ($check_stmt->rowCount() === 0) {
    echo json_encode(['success' => false, 'message' => 'Task not found or access denied']);
    exit;
    }

    // Mark task as completed
    $delete_query = "UPDATE tasks SET is_completed = 1 WHERE id = :task_id AND user_id = :user_id";
    $delete_stmt = $db->prepare($delete_query);
    $delete_stmt->bindParam(':task_id', $task_id);
    $delete_stmt->bindParam(':user_id', $user_id);  
    
    if ($delete_stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Task completed successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to complete task']);
    }
    
} catch (Exception $e) {
    error_log("Complete task error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>