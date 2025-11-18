<?php
/**
 * Price Estimation Endpoint using Railway Python API
 * 
 * This version calls a Python API hosted on Railway for ML calculations
 */

session_start();
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Configuration
define('PYTHON_API_URL', 'https://web-production-7f611.up.railway.app/api/estimate');
define('API_TIMEOUT', 30); // 30 seconds timeout

// Error log function
function logError($message, $data = null) {
    $log = date('Y-m-d H:i:s') . ' - ' . $message;
    if ($data) {
        $log .= ' - Data: ' . json_encode($data);
    }
    error_log($log);
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method. Use POST.');
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Enhanced validation
    if (!isset($input['property_size'])) {
        throw new Exception('Missing required parameter: property_size');
    }
    
    $property_size = floatval($input['property_size']);
    $property_name = $input['name'] ?? '';
    $property_barangay = $input['barangay'] ?? '';
    $property_street = $input['street'] ?? '';
    $property_type = $input['property_type'] ?? '';
    $property_class = $input['property_class'] ?? '';
    
    // Log input for debugging
    logError('Estimation request received', [
        'name' => $property_name,
        'barangay' => $property_barangay,
        'street' => $property_street,
        'type' => $property_type,
        'class' => $property_class,
        'size' => $property_size
    ]);
    
    if ($property_size <= 0) {
        throw new Exception('Property size must be a positive number');
    }
    
    // Check if property type and class are provided
    if (empty($property_type) || empty($property_class)) {
        throw new Exception('Property type and class are required for zonal value lookup.');
    }
    
    // Fetch zonal value data
    $zonal_data = fetchZonalValue($db, $property_type, $property_class, $property_barangay, $property_street, $property_size);
    
    if (empty($zonal_data['best_match'])) {
        throw new Exception('No matching zonal value found. Please check property details.');
    }
    
    // Get data
    $calculated_prices = $zonal_data['calculated_prices'];
    $price_per_sqm = $zonal_data['price_per_sqm'];
    $current_price = $calculated_prices['2025'];
    
    // Prepare historical TOTAL prices for API (2020-2024 only)
    // Each value is: price_per_sqm × property_size
    $historical_total_prices = [
        '2020' => $calculated_prices['2020'],
        '2021' => $calculated_prices['2021'],
        '2022' => $calculated_prices['2022'],
        '2023' => $calculated_prices['2023'],
        '2024' => $calculated_prices['2024']
    ];
    
    // Validate historical data
    foreach ($historical_total_prices as $year => $price) {
        if ($price <= 0) {
            throw new Exception("Invalid total price for year {$year}: {$price}");
        }
    }
    
    // Call Python API on Railway
    $api_result = callPythonAPI($current_price, $property_size, $historical_total_prices);
    
    if (!$api_result['success']) {
        throw new Exception($api_result['message'] ?? 'API call failed');
    }
    
    // Build address
    $address_parts = array_filter([$property_street, $property_barangay]);
    $full_address = implode(', ', $address_parts);
    
    // Add property info
    $api_result['property_info'] = [
        'name' => $property_name,
        'address' => $full_address,
        'barangay' => $property_barangay,
        'street' => $property_street,
        'type' => $property_type,
        'class' => $property_class,
        'size' => $property_size,
        'current_price' => $current_price
    ];
    
    // Add zonal value info
    $api_result['zonal_value_info'] = [
        'source' => 'zonal_value',
        'best_match' => $zonal_data['best_match'],
        'confidence' => $zonal_data['confidence'],
        'match_count' => $zonal_data['match_count']
    ];
    
    // Add price per sqm for display
    $api_result['price_per_sqm_history'] = $price_per_sqm;
    $api_result['calculated_total_prices'] = $calculated_prices;
    
    $api_result['data_quality'] = [
        'source' => 'zonal_value',
        'matches_found' => $zonal_data['match_count'],
        'confidence' => $zonal_data['confidence'],
        'similar_properties' => 1,
        'exact_match' => $zonal_data['best_match']['similarity_score'] >= 100
    ];
    
    logEstimation($db, $api_result);
    
    echo json_encode($api_result);
    
} catch (Exception $e) {
    $error_response = [
        'success' => false,
        'message' => $e->getMessage(),
        'error' => true,
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ];
    
    logError('Estimation Error: ' . $e->getMessage(), $error_response);
    
    http_response_code(400);
    echo json_encode($error_response);
}

/**
 * Call Python API on Railway
 */
function callPythonAPI($current_price, $property_size, $historical_data) {
    $payload = [
        'current_price' => $current_price,
        'property_size' => $property_size,
        'historical_data' => $historical_data
    ];
    
    $ch = curl_init(PYTHON_API_URL);
    
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'User-Agent: InfinityFree-PHP/1.0'
        ],
        CURLOPT_TIMEOUT => API_TIMEOUT,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,  // Verify SSL certificate
        CURLOPT_SSL_VERIFYHOST => 2,     // Verify hostname matches certificate
        CURLOPT_FOLLOWLOCATION => true,  // Follow redirects if any
        CURLOPT_ENCODING => '',          // Accept all encodings
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1  // Use HTTP/1.1
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    $curl_errno = curl_errno($ch);
    $curl_info = curl_getinfo($ch);
    
    curl_close($ch);
    
    // Log detailed connection info for debugging
    logError('API Call Details', [
        'url' => PYTHON_API_URL,
        'http_code' => $http_code,
        'errno' => $curl_errno,
        'total_time' => $curl_info['total_time'],
        'connect_time' => $curl_info['connect_time']
    ]);
    
    if ($curl_error) {
        logError('CURL Error', [
            'error' => $curl_error,
            'errno' => $curl_errno,
            'payload_sent' => $payload
        ]);
        return [
            'success' => false,
            'message' => 'Failed to connect to estimation service: ' . $curl_error,
            'error_code' => $curl_errno
        ];
    }
    
    if ($http_code !== 200) {
        logError('API Error', [
            'http_code' => $http_code,
            'response' => substr($response, 0, 500),  // Log first 500 chars
            'payload_sent' => $payload
        ]);
        return [
            'success' => false,
            'message' => 'Estimation service returned error code: ' . $http_code,
            'response_preview' => substr($response, 0, 200)
        ];
    }
    
    $result = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        logError('JSON Decode Error', ['error' => json_last_error_msg()]);
        return [
            'success' => false,
            'message' => 'Invalid response from estimation service'
        ];
    }
    
    return $result;
}

/**
 * Fetch zonal value and calculate prices
 */
function fetchZonalValue($db, $property_type, $property_class, $barangay, $street, $property_size) {
    try {
        $query = "
            SELECT 
                zv.*,
                CASE 
                    WHEN zv.barangay = :exact_barangay 
                        AND zv.street = :exact_street
                        AND zv.property_type = :exact_type 
                        AND zv.class = :exact_class THEN 100
                    WHEN zv.barangay = :exact_barangay 
                        AND zv.property_type = :exact_type 
                        AND zv.class = :exact_class THEN 90
                    WHEN zv.barangay = :exact_barangay 
                        AND zv.street LIKE :street_match
                        AND zv.property_type = :exact_type THEN 85
                    WHEN zv.barangay = :exact_barangay 
                        AND zv.class = :exact_class THEN 80
                    WHEN zv.barangay = :exact_barangay 
                        AND zv.property_type = :exact_type THEN 75
                    WHEN zv.property_type = :exact_type 
                        AND zv.class = :exact_class THEN 60
                    WHEN zv.barangay = :exact_barangay THEN 50
                    WHEN zv.property_type = :exact_type THEN 40
                    WHEN zv.class = :exact_class THEN 30
                    ELSE 20
                END as similarity_score
            FROM 
                zonal_value zv
            WHERE 
                zv.is_active = 1
                AND (
                    zv.barangay = :exact_barangay 
                    OR zv.property_type = :exact_type
                    OR zv.class = :exact_class
                )
                AND zv.price_2020 > 0
            ORDER BY 
                similarity_score DESC,
                zv.id DESC
            LIMIT 1
        ";
        
        $stmt = $db->prepare($query);
        $street_pattern = '%' . trim($street) . '%';
        
        $stmt->bindParam(':exact_barangay', $barangay);
        $stmt->bindParam(':exact_street', $street);
        $stmt->bindParam(':street_match', $street_pattern);
        $stmt->bindParam(':exact_type', $property_type);
        $stmt->bindParam(':exact_class', $property_class);
        
        $stmt->execute();
        $zonal_value = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$zonal_value) {
            return [
                'calculated_prices' => [],
                'price_per_sqm' => [],
                'confidence' => 0,
                'match_count' => 0,
                'best_match' => null
            ];
        }
        
        // Extract price per sqm
        $price_per_sqm = [
            '2020' => floatval($zonal_value['price_2020']),
            '2021' => floatval($zonal_value['price_2021']),
            '2022' => floatval($zonal_value['price_2022']),
            '2023' => floatval($zonal_value['price_2023']),
            '2024' => floatval($zonal_value['price_2024']),
            '2025' => floatval($zonal_value['price_2025'])
        ];
        
        // Calculate total prices
        $calculated_prices = [];
        foreach ($price_per_sqm as $year => $price_sqm) {
            $calculated_prices[$year] = round($price_sqm * $property_size, 2);
        }
        
        $confidence = calculateConfidence($zonal_value);
        
        return [
            'zonal_value' => $zonal_value,
            'calculated_prices' => $calculated_prices,
            'price_per_sqm' => $price_per_sqm,
            'confidence' => $confidence,
            'match_count' => 1,
            'best_match' => [
                'id' => $zonal_value['id'],
                'barangay' => $zonal_value['barangay'],
                'street' => $zonal_value['street'],
                'vicinity' => $zonal_value['vicinity'],
                'property_type' => $zonal_value['property_type'],
                'class' => $zonal_value['class'],
                'similarity_score' => $zonal_value['similarity_score'],
                'data_source' => $zonal_value['data_source']
            ]
        ];
        
    } catch (Exception $e) {
        logError("Failed to fetch zonal value: " . $e->getMessage());
        return [
            'calculated_prices' => [],
            'price_per_sqm' => [],
            'confidence' => 0,
            'match_count' => 0,
            'best_match' => null
        ];
    }
}

/**
 * Calculate confidence score
 */
function calculateConfidence($match) {
    if (empty($match)) {
        return 30;
    }
    
    $similarity_score = floatval($match['similarity_score'] ?? 0);
    $base_confidence = ($similarity_score / 100) * 70;
    
    // Data completeness
    $data_completeness = 0;
    $years = ['2020', '2021', '2022', '2023', '2024', '2025'];
    foreach ($years as $year) {
        if ($match['price_' . $year] > 0) {
            $data_completeness += (100 / 6);
        }
    }
    $completeness_score = ($data_completeness / 100) * 20;
    
    // Source bonus
    $source_score = ($match['data_source'] === 'BIR') ? 10 : 5;
    
    $confidence = $base_confidence + $completeness_score + $source_score;
    
    return round(min(100, max(30, $confidence)));
}

/**
 * Log estimation
 */
function logEstimation($db, $data) {
    try {
        $address_parts = array_filter([
            $data['property_info']['street'] ?? '',
            $data['property_info']['barangay'] ?? ''
        ]);
        $full_address = implode(', ', $address_parts);
        
        $query = "INSERT INTO estimation_logs 
                  (property_name, property_address, property_type, property_class, 
                   current_price, estimated_price, profit_projection, percentage_growth, 
                   confidence_score, data_source, created_at) 
                  VALUES 
                  (:name, :address, :type, :class, :current, :estimated, 
                   :profit, :growth, :confidence, :source, NOW())";
        
        $stmt = $db->prepare($query);
        $data_source = 'railway_python_api';
        
        $stmt->bindParam(':name', $data['property_info']['name']);
        $stmt->bindParam(':address', $full_address);
        $stmt->bindParam(':type', $data['property_info']['type']);
        $stmt->bindParam(':class', $data['property_info']['class']);
        $stmt->bindParam(':current', $data['estimation']['current_price']);
        $stmt->bindParam(':estimated', $data['estimation']['estimated_price']);
        $stmt->bindParam(':profit', $data['estimation']['profit_projection']);
        $stmt->bindParam(':growth', $data['estimation']['percentage_growth']);
        $stmt->bindParam(':confidence', $data['estimation']['confidence_score']);
        $stmt->bindParam(':source', $data_source);
        
        $stmt->execute();
        
    } catch (Exception $e) {
        logError('Failed to log estimation: ' . $e->getMessage());
    }
}
?>