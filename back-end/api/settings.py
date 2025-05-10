# Add the following configurations if they're not already present

INSTALLED_APPS = [
    # ...existing code...
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'authentication',
]

MIDDLEWARE = [
    # ...existing code...
    'corsheaders.middleware.CorsMiddleware',  # Add this before CommonMiddleware
    # ...other middleware...
]

# Allow requests from your React frontend
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Adjust if your React app runs on a different port
]

# Add rest_framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
}