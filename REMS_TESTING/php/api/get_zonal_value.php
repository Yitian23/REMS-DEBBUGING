<?php
/**
 * Fetch zonal value data for property estimation
 * This replaces get_historical_data.php to use zonal_value table
 */

session_start();
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['property_type']) || !isset($input['property_class'])) {
        throw new Exception('Missing required parameters: property_type and property_class are required');
    }
    
    $property_type = $input['property_type'];
    $property_class = $input['property_class'];
    $barangay = $input['barangay'] ?? '';
    $street = $input['street'] ?? '';
    $property_size = floatval($input['property_size'] ?? 0);
    
    // Query to fetch matching zonal values
    // Priority: Exact match (barangay, street, type, class) > Partial matches
    $query = "
        SELECT 
            zv.*,
            -- Calculate similarity score based on matching criteria
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
        LIMIT 10
    ";
    
    $stmt = $db->prepare($query);
    
    // Bind parameters
    $street_pattern = '%' . trim($street) . '%';
    
    $stmt->bindParam(':exact_barangay', $barangay);
    $stmt->bindParam(':exact_street', $street);
    $stmt->bindParam(':street_match', $street_pattern);
    $stmt->bindParam(':exact_type', $property_type);
    $stmt->bindParam(':exact_class', $property_class);
    
    $stmt->execute();
    
    $zonal_values = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Process the data
    $result = processZonalValue($zonal_values, $property_size);
    
    $response = [
        'success' => true,
        'zonal_values' => $zonal_values,
        'calculated_prices' => $result['calculated_prices'],
        'price_per_sqm' => $result['price_per_sqm'],
        'confidence' => $result['confidence'],
        'match_count' => count($zonal_values),
        'best_match' => $result['best_match'],
        'search_criteria' => [
            'property_type' => $property_type,
            'property_class' => $property_class,
            'barangay' => $barangay,
            'street' => $street,
            'property_size' => $property_size
        ]
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("Zonal value fetch error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Process zonal value data and calculate prices based on property size
 */
function processZonalValue($zonal_values, $property_size) {
    if (empty($zonal_values)) {
        // Return default values if no match
        return [
            'calculated_prices' => [],
            'price_per_sqm' => [
                '2020' => 45,
                '2021' => 52,
                '2022' => 61,
                '2023' => 73,
                '2024' => 85,
                '2025' => 100
            ],
            'confidence' => 30,
            'best_match' => null
        ];
    }
    
    // Use the best match (highest similarity score)
    $best_match = $zonal_values[0];
    
    $years = ['2020', '2021', '2022', '2023', '2024', '2025'];
    $calculated_prices = [];
    $price_per_sqm = [];
    
    foreach ($years as $year) {
        $price_field = 'price_' . $year;
        $price_sqm = floatval($best_match[$price_field]);
        
        // Store price per sqm
        $price_per_sqm[$year] = $price_sqm;
        
        // Calculate total price: property_size × price_per_sqm
        if ($property_size > 0) {
            $calculated_prices[$year] = round($price_sqm * $property_size, 2);
        } else {
            $calculated_prices[$year] = 0;
        }
    }
    
    // Calculate confidence based on match quality
    $confidence = calculateConfidence($best_match);
    
    return [
        'calculated_prices' => $calculated_prices,
        'price_per_sqm' => $price_per_sqm,
        'confidence' => $confidence,
        'best_match' => [
            'id' => $best_match['id'],
            'barangay' => $best_match['barangay'],
            'street' => $best_match['street'],
            'vicinity' => $best_match['vicinity'],
            'property_type' => $best_match['property_type'],
            'class' => $best_match['class'],
            'similarity_score' => $best_match['similarity_score'],
            'data_source' => $best_match['data_source']
        ]
    ];
}

/**
 * Calculate confidence score based on match quality
 */
function calculateConfidence($match) {
    if (empty($match)) {
        return 30; // Low confidence with no match
    }
    
    $similarity_score = floatval($match['similarity_score'] ?? 0);
    
    // Base confidence from similarity score (max 70 points)
    $base_confidence = ($similarity_score / 100) * 70;
    
    // Data completeness check (max 20 points)
    $data_completeness = 0;
    $years = ['2020', '2021', '2022', '2023', '2024', '2025'];
    foreach ($years as $year) {
        if ($match['price_' . $year] > 0) {
            $data_completeness += (100 / 6); // Each year adds ~16.67%
        }
    }
    $completeness_score = ($data_completeness / 100) * 20;
    
    // Data source bonus (max 10 points)
    $source_score = ($match['data_source'] === 'BIR') ? 10 : 5;
    
    // Final confidence score
    $confidence = $base_confidence + $completeness_score + $source_score;
    
    return round(min(100, max(30, $confidence)));
}
?>
