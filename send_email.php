<?php
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // Sanitize input
    $name = htmlspecialchars(strip_tags(trim($_POST["name"])));
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $message = htmlspecialchars(strip_tags(trim($_POST["message"])));

    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        header("Location: index.html?status=invalid_email");
        exit();
    }

    // Email configuration
    $to = "saisushvik.pnt@gmail.com";
    $subject = "New Message from Website";
    $headers = "From: $email\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    $fullMessage = "Name: $name\n";
    $fullMessage .= "Email: $email\n\n";
    $fullMessage .= "Message:\n$message\n";

    // Send the email
    if (mail($to, $subject, $fullMessage, $headers)) {
        // Redirect back to the form with a success message
        header("Location: index.html?status=success");
    } else {
        // Redirect back to the form with an error message
        header("Location: index.html?status=error");
    }
} else {
    // Respond with a 405 Method Not Allowed status code
    http_response_code(405);
    echo "405 Method Not Allowed";
}
exit();
?>