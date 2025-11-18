<?php
session_start();
require_once __DIR__ . '/../config/database.php';

// Check if user is logged in
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

header('Content-Type: application/json');

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $agent_id = $_SESSION['user_id'];
    
    // Get all tasks for the current agent that are not completed
    $query = "SELECT * FROM tasks WHERE user_id = :user_id AND is_completed = 0 ORDER BY created_at DESC";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $agent_id);
    $stmt->execute();
    
    $tasks = $stmt->fetchAll();
    
    // Debug: Log the raw tasks
    error_log("Raw tasks found: " . json_encode($tasks));
    
    // Group tasks by type
    $grouped_tasks = [
        'todo' => [],
        'call' => [],
        'email' => []
    ];
    
    foreach ($tasks as $task) {
        $grouped_tasks[$task['task_type']][] = $task;
    }
    
    // Count tasks by type
    $task_counts = [
        'todo' => count($grouped_tasks['todo']),
        'call' => count($grouped_tasks['call']),
        'email' => count($grouped_tasks['email'])
    ];
    
    // Debug: Log the grouped tasks
    error_log("Grouped tasks: " . json_encode($grouped_tasks));
    error_log("Task counts: " . json_encode($task_counts));
    
    echo json_encode([
        'success' => true,
        'tasks' => $grouped_tasks,
        'counts' => $task_counts
    ]);
    
} catch (Exception $e) {
    error_log("Get tasks error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>