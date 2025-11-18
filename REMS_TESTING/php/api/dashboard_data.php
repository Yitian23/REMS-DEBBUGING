<?php
session_start();
require_once __DIR__ . '/../config/database.php';

// Check if user is logged in
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated', 'redirect' => 'index.html']);
    exit;
}

// Set content type to JSON
header('Content-Type: application/json');

try {
    // Get database connection
    $database = new Database();
    $db = $database->getConnection();
    
    // Get current user data
    $user_id = $_SESSION['user_id'];
    $query = "SELECT first_name, last_name, email, user_type FROM users WHERE id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    
    $user = $stmt->fetch();
    
    if (!$user) {
        session_destroy();
        echo json_encode(['success' => false, 'message' => 'User not found', 'redirect' => 'index.html']);
        exit;
    }
    
    // Get statistics for properties
    $stats_query = "SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN status IN ('New Lead', 'Proposal', 'Follow Up', 'On Progress', 'Negotiation', 'Signing Contract') THEN 1 ELSE 0 END) as open_deals,
        SUM(CASE WHEN status = 'New Lead' THEN 1 ELSE 0 END) as new_leads,
        SUM(CASE WHEN status = 'On Progress' THEN 1 ELSE 0 END) as on_progress,
        SUM(CASE WHEN status = 'Signing Contract' THEN 1 ELSE 0 END) as signing_contract,
        SUM(CASE WHEN status = 'Closed Deal' THEN 1 ELSE 0 END) as closed_deals
    FROM properties 
    WHERE agent_id = :user_id";
    
    $stmt = $db->prepare($stats_query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    $stats = $stmt->fetch();
    
    // Get tasks statistics and recent tasks
    $tasks_query = "SELECT 
        id, title, task_type, status, priority, assigned_to, due_date, property_id
    FROM tasks 
    WHERE user_id = :user_id AND is_completed = 0
    ORDER BY 
        CASE 
            WHEN due_date IS NULL THEN 1 
            ELSE 0 
        END,
        due_date ASC,
        CASE priority
            WHEN 'High' THEN 1
            WHEN 'Medium' THEN 2
            WHEN 'Low' THEN 3
        END";
    
    $stmt = $db->prepare($tasks_query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->execute();
    $all_tasks = $stmt->fetchAll();
    
    // Separate tasks by type
    $tasks = [
        'todo' => [],
        'call' => [],
        'email' => []
    ];
    
    $tasks_count = [
        'todo' => 0,
        'call' => 0,
        'email' => 0
    ];
    
    foreach ($all_tasks as $task) {
        $task_type = $task['task_type'];
        
        // Get property info if task is linked to a property
        $property_info = null;
        if ($task['property_id']) {
            $prop_query = "SELECT owner_name FROM properties WHERE id = :property_id";
            $prop_stmt = $db->prepare($prop_query);
            $prop_stmt->bindParam(':property_id', $task['property_id']);
            $prop_stmt->execute();
            $property = $prop_stmt->fetch();
            if ($property) {
                $property_info = $property['owner_name'];
            }
        }
        
        // Add to respective array (NO MORE LIMIT!)
        $tasks[$task_type][] = [
            'id' => $task['id'],
            'title' => $task['title'],
            'status' => $task['status'],
            'priority' => $task['priority'],
            'assigned_to' => $task['assigned_to'],
            'due_date' => $task['due_date'],
            'property_name' => $property_info
        ];
    }
    
    // Count all tasks per type
    foreach (['todo', 'call', 'email'] as $type) {
        $tasks_count[$type] = count($tasks[$type]);
    }
    
    // Return complete dashboard data
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user_id,
            'name' => $user['first_name'] . ' ' . $user['last_name'],
            'email' => $user['email'],
            'type' => $user['user_type']
        ],
        'stats' => [
            'total_leads' => (int)($stats['total_leads'] ?? 0),
            'open_deals' => (int)($stats['open_deals'] ?? 0),
            'new_leads' => (int)($stats['new_leads'] ?? 0),
            'on_progress' => (int)($stats['on_progress'] ?? 0),
            'signing_contract' => (int)($stats['signing_contract'] ?? 0),
            'closed_deals' => (int)($stats['closed_deals'] ?? 0)
        ],
        'tasks' => $tasks,
        'tasks_count' => $tasks_count
    ]);
    
} catch (Exception $e) {
    error_log("Dashboard error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}
?>