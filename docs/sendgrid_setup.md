# SendGrid Setup Guide

This guide will walk you through the process of setting up SendGrid for sending emails in your application.

## Prerequisites

- A SendGrid account. If you don't have one, sign up at [SendGrid](https://signup.sendgrid.com/).

## Part 1: Verify a Sender Identity

To send emails through SendGrid, you must verify the email address you will be sending from. This is required to prevent spam and ensure email deliverability.

1.  **Log in** to your SendGrid dashboard.
2.  Navigate to **Settings** > **Sender Authentication** in the left sidebar.
3.  Click on the **Verify a Single Sender** button.
4.  **Fill in the Create a Sender form:**
    *   **From Name**: The name displayed to recipients (e.g., "Bus Ticket Support").
    *   **From Email Address**: The email you want to send *from* (e.g., your personal Gmail or business email).
    *   **Reply To**: Usually the same as "From Email" or a support address.
    *   **Company Address** details: Fill in your physical address information (required by anti-spam laws).
5.  Click **Create**.
6.  **Verify your email**: SendGrid will send a verification email to the "From Email Address" you specified.
    *   Open your inbox.
    *   Find the email from SendGrid.
    *   Click the **Verify Single Sender** link.

> [!IMPORTANT]
> The `EMAIL_FROM` (or `EMAIL_USER`) in your `.env` file **MUST** match this verified email address exactly. If they do not match, you will receive a `403 Forbidden` error.

## Part 2: Generate an API Key

1.  Navigate to **Settings** > **API Keys** in the left sidebar.
2.  Click **Create API Key**.
3.  **Name your key**: Give it a descriptive name (e.g., "BusTicketApp").
4.  **Select Permissions**:
    *   **Full Access**: Easiest for development.
    *   **Restricted Access**: Recommended for production. If choosing this, ensure you enable **Mail Send** permissions.
5.  Click **Create & View**.
6.  **Copy the API Key**:
    *   Click on the API key to copy it to your clipboard.
    *   **SAVE THIS KEY IMMEDIATELY**. SendGrid will *never* show it to you again.

## Part 3: Configuration

Update your `.env` file with the new credentials:

```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=YOUR_COPIED_API_KEY_STARTS_WITH_SG
EMAIL_FROM=your_verified_email@example.com
```

You are now ready to send emails!
