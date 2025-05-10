# Update only the relevant part

INSTALLED_APPS = [
    # ...existing apps...
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',  # For cross-origin requests from React
    'authentication',  # Your new authentication app
    'accounts',
    'products',
    'chat',
    # ...other apps...
]

MIDDLEWARE = [
    # ...other middleware...
    'corsheaders.middleware.CorsMiddleware',  # Add this before CommonMiddleware
    'django.middleware.common.CommonMiddleware',
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

AUTH_USER_MODEL = 'accounts.CustomUser'
