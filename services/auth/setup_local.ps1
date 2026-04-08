Write-Host "Setting up Python virtual environment..."
python -m venv venv
.\venv\Scripts\activate

Write-Host "Installing dependencies..."
pip install -r requirements.txt

Write-Host "Running migrations..."
python manage.py migrate

Write-Host "Creating superuser..."
python manage.py create_superuser admin@example.com password12345 --first-name Admin --last-name User

Write-Host "Setup complete. You can now run the server using: python manage.py runserver"
