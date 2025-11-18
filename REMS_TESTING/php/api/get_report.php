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
    
    // Get all properties grouped by status
    $query = "SELECT * FROM properties WHERE agent_id = :agent_id ORDER BY 
              CASE status
                  WHEN 'New Lead' THEN 1
                  WHEN 'Proposal' THEN 2
                  WHEN 'Follow Up' THEN 3
                  WHEN 'On Progress' THEN 4
                  WHEN 'Negotiation' THEN 5
                  WHEN 'Signing Contract' THEN 6
                  WHEN 'Closed Deal' THEN 7
                  WHEN 'Not Interested' THEN 8
                  ELSE 9
              END, created_at DESC";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':agent_id', $agent_id);
    $stmt->execute();
    
    $properties = $stmt->fetchAll();
    
    // Group properties by status
    $grouped_properties = [
        'New Lead' => [],
        'Proposal' => [],
        'Follow Up' => [],
        'On Progress' => [],
        'Negotiation' => [],
        'Signing Contract' => [],
        'Closed Deal' => [],
        'Not Interested' => []
    ];
    
    foreach ($properties as $property) {
        $status = $property['status'] ?? 'New Lead';
        if (isset($grouped_properties[$status])) {
            $grouped_properties[$status][] = $property;
        } else {
            $grouped_properties['New Lead'][] = $property;
        }
    }
    
    // Count properties by status
    $counts = [];
    foreach ($grouped_properties as $status => $props) {
        $counts[$status] = count($props);
    }
    
    echo json_encode([
        'success' => true,
        'properties' => $grouped_properties,
        'counts' => $counts,
        'total' => count($properties)
    ]);
    
} catch (Exception $e) {
    error_log("Get report error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred']);
}
?>