<?php
/**
 * Check Session Status
 * Returns authentication status and user information
 */

session_start();

header('Content-Type: application/json');

try {
    // Check if user is logged in
    $authenticated = isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
    
    $response = [
        'authenticated' => $authenticated,
        'user' => null
    ];
    
    if ($authenticated) {
        // Get user information from session
        $response['user'] = [
            'id' => $_SESSION['user_id'] ?? null,
            'email' => $_SESSION['user_email'] ?? null,
            'name' => $_SESSION['user_name'] ?? 'User',
            'role' => $_SESSION['user_role'] ?? 'user'
        ];
    }
    
    echo json_encode($response);
    
} catch (Exception $e) {
    echo json_encode([
        'authenticated' => false,
        'error' => 'Session check failed',
        'message' => $e->getMessage()
    ]);
}
?>