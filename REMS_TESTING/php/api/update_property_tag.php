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
    
    $agent_id = $_SESSION['user_id'];
    
    $input = json_decode(file_get_contents('php://input'), true);
    $property_id = $input['property_id'] ?? null;
    $tag = $input['tag'] ?? null;
    
    if (!$property_id || !$tag) {
        echo json_encode(['success' => false, 'message' => 'Property ID and tag are required']);
        exit;
    }
    
    // Verify property belongs to current agent
    $check_query = "SELECT id FROM properties WHERE id = :property_id AND agent_id = :agent_id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':property_id', $property_id);
    $check_stmt->bindParam(':agent_id', $agent_id);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() === 0) {
        echo json_encode(['success' => false, 'message' => 'Property not found or access denied']);
        exit;
    }
    
    // Update tag
    $update_query = "UPDATE properties SET status = :tag, updated_at = CURRENT_TIMESTAMP WHERE id = :property_id AND agent_id = :agent_id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':tag', $tag);
    $update_stmt->bindParam(':property_id', $property_id);
    $update_stmt->bindParam(':agent_id', $agent_id);
    
    if ($update_stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Tag updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update tag']);
    }
    
} catch (Exception $e) {
    error_log("Update property tag error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred']);
}
?>