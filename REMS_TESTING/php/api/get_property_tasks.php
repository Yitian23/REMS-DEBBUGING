<?php
session_start();
require_once __DIR__ . '/../config/database.php';

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

header('Content-Type: application/json');

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $user_id = $_SESSION['user_id'];
    $property_id = $_GET['property_id'] ?? null;
    
    if (!$property_id) {
        echo json_encode(['success' => false, 'message' => 'Property ID is required']);
        exit;
    }
    
    // Verify property belongs to user
    $check_query = "SELECT id FROM properties WHERE id = :property_id AND agent_id = :user_id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':property_id', $property_id);
    $check_stmt->bindParam(':user_id', $user_id);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() === 0) {
        echo json_encode(['success' => false, 'message' => 'Property not found']);
        exit;
    }
    
    // Get tasks ONLY for this specific property (not general tasks)
    // Changed: Removed "OR property_id IS NULL" to exclude general tasks
    $query = "SELECT * FROM tasks 
              WHERE user_id = :user_id 
              AND property_id = :property_id
              AND is_completed = 0 
              ORDER BY created_at DESC";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':property_id', $property_id);
    $stmt->execute();
    
    $tasks = $stmt->fetchAll();
    
    $grouped_tasks = [
        'todo' => [],
        'call' => [],
        'email' => []
    ];
    
    foreach ($tasks as $task) {
        $grouped_tasks[$task['task_type']][] = $task;
    }
    
    $task_counts = [
        'todo' => count($grouped_tasks['todo']),
        'call' => count($grouped_tasks['call']),
        'email' => count($grouped_tasks['email'])
    ];
    
    echo json_encode([
        'success' => true,
        'tasks' => $grouped_tasks,
        'counts' => $task_counts
    ]);
    
} catch (Exception $e) {
    error_log("Get property tasks error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred']);
}
?>