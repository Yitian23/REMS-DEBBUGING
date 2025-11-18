<?php
/**
 * Session Verification Endpoint
 * Returns JSON indicating whether the user has a valid session
 */
session_start();

// Set content type to JSON
header('Content-Type: application/json');

// Prevent caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

// Check if user is logged in
$authenticated = isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;

if ($authenticated) {
    // Session is valid
    echo json_encode([
        'success' => true,
        'authenticated' => true,
        'user_id' => $_SESSION['user_id'] ?? null,
        'user_email' => $_SESSION['user_email'] ?? null,
        'user_name' => $_SESSION['user_name'] ?? null
    ]);
} else {
    // Session is invalid or doesn't exist
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'message' => 'No valid session found'
    ]);
}
?>