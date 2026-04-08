from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from faker import Faker
from users.models import Roles

User = get_user_model()


class Command(BaseCommand):
    help = 'Create fake user profiles with random roles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=20,
            help='Number of fake users to create'
        )

    def handle(self, *args, **options):
        count = options['count']
        fake = Faker()

        created_count = 0
        for _ in range(count):
            # Generate fake user data
            email = fake.email()
            first_name = fake.first_name()
            last_name = fake.last_name()

            # Check if user already exists
            if User.objects.filter(email=email).exists():
                self.stdout.write(self.style.WARNING(f'User with email {email} already exists, skipping'))
                continue

            # Create user
            user = User.objects.create_user(
                email=email,
                password="TestPass1234",
                first_name=first_name,
                last_name=last_name
            )

            # Assign a random role
            role = fake.random_element(['user', 'agent', 'admin'])
            Roles.objects.get_or_create(user=user, role=role)

            created_count += 1
            self.stdout.write(f'Created user: {email} with role: {role}')

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} fake user profiles')
        )