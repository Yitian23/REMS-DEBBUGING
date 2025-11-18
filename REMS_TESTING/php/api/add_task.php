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
    
    $agent_id = $_SESSION['user_id'];
    
    // Get form data
    $title = trim($_POST['title'] ?? '');
    $task_type = $_POST['task_type'] ?? '';
    $status = $_POST['status'] ?? 'Not Started';
    $priority = $_POST['priority'] ?? 'Medium';
    $assigned_to = trim($_POST['assigned_to'] ?? '');
    $due_date = $_POST['due_date'] ?? null;
    $due_time = $_POST['due_time'] ?? null;
    $queue_number = $_POST['queue_number'] ?? 1;
    $notes = trim($_POST['notes'] ?? '');
    
    // Validate required fields
    $errors = [];
    if (empty($title)) $errors[] = 'Task title is required';
    if (empty($task_type)) $errors[] = 'Task type is required';
    
    // Only validate status and priority for todo tasks
    if ($task_type === 'todo') {
        if (empty($priority)) $errors[] = 'Priority is required for todo tasks';
    } else {
        // Set default values for non-todo tasks
        $status = null;
        $priority = null;
    }
    
    if (!empty($errors)) {
        echo json_encode(['success' => false, 'message' => implode(', ', $errors)]);
        exit;
    }
    
    // Convert empty strings to null
    $due_date = $due_date === '' ? null : $due_date;
    $due_time = $due_time === '' ? null : $due_time;
    $assigned_to = $assigned_to === '' ? null : $assigned_to;
    $notes = $notes === '' ? null : $notes;
    
    // Insert task
    $query = "INSERT INTO tasks (
        user_id, title, task_type, status, priority, assigned_to, 
        due_date, due_time, queue_number, notes
    ) VALUES (
        :user_id, :title, :task_type, :status, :priority, :assigned_to,
        :due_date, :due_time, :queue_number, :notes
    )";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $agent_id);
    $stmt->bindParam(':title', $title);
    $stmt->bindParam(':task_type', $task_type);
    $stmt->bindParam(':status', $status);
    $stmt->bindParam(':priority', $priority);
    $stmt->bindParam(':assigned_to', $assigned_to);
    $stmt->bindParam(':due_date', $due_date);
    $stmt->bindParam(':due_time', $due_time);
    $stmt->bindParam(':queue_number', $queue_number);
    $stmt->bindParam(':notes', $notes);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true, 
            'message' => 'Task created successfully!',
            'task_id' => $db->lastInsertId()
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to create task']);
    }
    
} catch (Exception $e) {
    error_log("Add task error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>