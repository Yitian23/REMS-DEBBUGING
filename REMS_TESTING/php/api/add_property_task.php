<?php
session_start();
require_once __DIR__ . '/../config/database.php';

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
    
    $property_id = $_POST['property_id'] ?? null;
    $title = trim($_POST['title'] ?? '');
    $task_type = $_POST['task_type'] ?? '';
    $status = $_POST['status'] ?? 'Not Started';
    $priority = $_POST['priority'] ?? 'Medium';
    $assigned_to = trim($_POST['assigned_to'] ?? '');
    $due_date = $_POST['due_date'] ?? null;
    $due_time = $_POST['due_time'] ?? null;
    $queue_number = $_POST['queue_number'] ?? 1;
    $notes = trim($_POST['notes'] ?? '');
    
    if (empty($property_id)) {
        echo json_encode(['success' => false, 'message' => 'Property ID is required']);
        exit;
    }
    
    if (empty($title)) {
        echo json_encode(['success' => false, 'message' => 'Task title is required']);
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
    
    if ($task_type !== 'todo') {
        $status = null;
        $priority = null;
    }
    
    $due_date = $due_date === '' ? null : $due_date;
    $due_time = $due_time === '' ? null : $due_time;
    $assigned_to = $assigned_to === '' ? null : $assigned_to;
    $notes = $notes === '' ? null : $notes;
    
    $query = "INSERT INTO tasks (
        user_id, property_id, title, task_type, status, priority, assigned_to, 
        due_date, due_time, queue_number, notes
    ) VALUES (
        :user_id, :property_id, :title, :task_type, :status, :priority, :assigned_to,
        :due_date, :due_time, :queue_number, :notes
    )";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':property_id', $property_id);
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
    error_log("Add property task error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred']);
}
?>