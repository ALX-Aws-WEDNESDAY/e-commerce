docker compose up -d
if ($LASTEXITCODE -ne 0) { throw "Docker compose failed" }

Write-Host "Waiting for database to start..."
Start-Sleep -Seconds 10

python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py create_superuser admin@example.com password12345 --first-name Admin --last-name User
