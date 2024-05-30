<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = $_POST["name"];
    $email = $_POST["email"];
    $message = $_POST["message"];

    $to = "saisushvik.pnt@gmail.com";
    $subject = "New Message from Website";
    $headers = "From: $email\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    $fullMessage = "Name: $name\n";
    $fullMessage .= "Email: $email\n\n";
    $fullMessage .= "Message:\n$message\n";

    if (mail($to, $subject, $fullMessage, $headers)) {
        // Redirect back to the form with a success message
        header("Location: index.html?status=success");
    } else {
        // Redirect back to the form with an error message
        header("Location: index.html?status=error");
    }
} else {
    // Redirect back to the form with an error message
    header("Location: index.html?status=error");
}
exit();
?>
