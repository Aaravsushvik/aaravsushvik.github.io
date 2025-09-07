<?php
session_start();

// Configuration
define("ADMIN_EMAIL", "saisushvik.pnt@gmail.com");

// Generate CSRF token
function generateCsrfToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

// Initialize variables
$status = '';
$message = '';

// Handle form submission
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // Validate CSRF token
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
        http_response_code(403);
        echo "Invalid CSRF token.";
        exit();
    }

    // Sanitize and validate input
    $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
    $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
    $user_message = filter_input(INPUT_POST, 'message', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

    if (!$name || !$email || !$user_message || strlen($name) > 100 || strlen($user_message) > 1000) {
        $status = "validation_error";
    } else {
        // Prepare email
        $subject = "New Message from Website";
        $headers = [
            "From: " . htmlspecialchars($email),
            "Reply-To: " . htmlspecialchars($email),
            "Content-Type: text/plain; charset=UTF-8"
        ];

        $fullMessage = "Name: " . htmlspecialchars($name) . "\n";
        $fullMessage .= "Email: " . htmlspecialchars($email) . "\n\n";
        $fullMessage .= "Message:\n" . htmlspecialchars($user_message) . "\n";

        // Send email
        if (mail(ADMIN_EMAIL, $subject, $fullMessage, implode("\r\n", $headers))) {
            $status = "success";
        } else {
            $status = "error";
        }
    }
}

// Generate CSRF token for form
$csrf_token = generateCsrfToken();

// Prepare message for display
if ($status === "success") {
    $message = "Message sent successfully!";
} elseif ($status === "error") {
    $message = "Failed to send the message.";
} elseif ($status === "validation_error") {
    $message = "Please fill all fields correctly.";
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Contact Us</title>
</head>
<body>
    <h1>Contact Us</h1>

    <?php if ($message): ?>
        <p><?php echo htmlspecialchars($message); ?></p>
    <?php endif; ?>

    <form method="POST" action="">
        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
        
        <label for="name">Name:<br>
            <input type="text" id="name" name="name" required maxlength="100">
        </label><br><br>
        
        <label for="email">Email:<br>
            <input type="email" id="email" name="email" required>
        </label><br><br>
        
        <label for="message">Message:<br>
            <textarea id="message" name="message" required maxlength="1000"></textarea>
        </label><br><br>
        
        <button type="submit">Send</button>
    </form>
</body>
</html>