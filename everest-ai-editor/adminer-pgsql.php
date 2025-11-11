<?php
/**
 * Adminer - PostgreSQL version
 * Modified to default to PostgreSQL instead of MySQL
 */

// Force PostgreSQL as default driver
$_GET['pgsql'] = '';

// Include the original Adminer
include 'adminer.php';
?>
