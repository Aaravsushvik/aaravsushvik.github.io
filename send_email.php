<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = $_POST["name"];
    $email = $_POST["email"];
    $message = $_POST["message"];

    $to = "saisushvik.pnt@gmail.com";
    $subject = "New Message from Website";
    $headers = "From: $email";

    mail($to, $subject, $message, $headers);

    // Redirect back to the form with a success message
    header("Location: index.html?status=success");
} else {
    // Redirect back to the form with an error message
    header("Location: index.html?status=error");
}
?>
