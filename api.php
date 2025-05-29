<?php
header('Content-Type: application/json');

$delay = rand(1, 5);

sleep($delay);

$response = ['delay' => $delay];

echo json_encode($response, JSON_PRETTY_PRINT);
?>