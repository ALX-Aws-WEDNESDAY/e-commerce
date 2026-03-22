from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models import Roles

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a superuser and assign admin role'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address of the superuser')
        parser.add_argument('password', type=str, help='Password for the superuser')
        parser.add_argument('--first-name', type=str, default='', help='First name of the user')
        parser.add_argument('--last-name', type=str, default='', help='Last name of the user')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        first_name = options.get('first_name', '')
        last_name = options.get('last_name', '')

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User with email {email} already exists'))
            return

        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        Roles.objects.get_or_create(user=user, role='admin')
        
        self.stdout.write(self.style.SUCCESS(f'Superuser {email} created successfully'))
