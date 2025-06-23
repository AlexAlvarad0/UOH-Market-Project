FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Instalar dependencias del sistema para OpenCV
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy project code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Run migrations and start Daphne server
# Railway provides PORT environment variable
CMD python manage.py migrate && daphne -b 0.0.0.0 -p ${PORT} backend.asgi:application
