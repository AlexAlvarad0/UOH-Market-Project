# Django and React Project

This project is a full-stack application built with Django as the backend and React with Vite as the frontend.

## Backend

The backend is built using Django and provides a RESTful API. It includes:

- `manage.py`: Command-line utility for interacting with the Django project.
- `requirements.txt`: Lists the required Python packages.
- `core/`: Contains the main settings and configuration files.
- `api/`: Contains the models, serializers, views, and URL patterns for the API.

### API Endpoints

- `/api/products/`: CRUD operations for products
- `/api/categories/`: Get available categories
- `/api/favorites/`: Manage favorite products
- `/api/conversations/`: Message system between users
- `/api/auth/`: Authentication endpoints

## Frontend

The frontend is built using React and Vite. It includes:

- `src/`: Contains the source code for the React application.
- `index.html`: The main HTML file for the React application.
- `package.json`: Configuration file for npm, listing dependencies and scripts.
- `vite.config.ts`: Configuration file for Vite.

### Features

- **Product Management**: View, create, edit, and delete products
- **Filtering and Searching**: Filter products by category, condition, price range
- **User Authentication**: Register, login, and manage profile
- **Favorites**: Mark products as favorites and view them in a dedicated page
- **Messaging**: Chat with sellers about their products

## Getting Started

To get started with the project, follow these steps:

1. Set up the backend:
   - Navigate to the `backend` directory.
   - Install the required packages using `pip install -r requirements.txt`.
   - Run the server using `python manage.py runserver`.

2. Set up the frontend:
   - Navigate to the `frontend` directory.
   - Install the required packages using `npm install`.
   - Start the development server using `npm run dev`.

## License

This project is licensed under the MIT License.# UOH-Market
