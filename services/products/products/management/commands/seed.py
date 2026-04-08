from django.core.management.base import BaseCommand
from faker import Faker
from products.models import Category, Product
import random


class Command(BaseCommand):
    help = 'Create fake categories and products'

    def add_arguments(self, parser):
        parser.add_argument(
            '--categories',
            type=int,
            default=5,
            help='Number of categories to create',
        )
        parser.add_argument(
            '--products',
            type=int,
            default=20,
            help='Number of products to create',
        )

    def handle(self, *args, **options):
        fake = Faker()

        # Create categories
        categories = []
        for _ in range(options['categories']):
            category, created = Category.objects.get_or_create(
                name=fake.unique.company(),
                defaults={
                    'description': fake.text(max_nb_chars=200),
                    'is_active': True,
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created category: {category.name}'))
            categories.append(category)

        # Create products
        for _ in range(options['products']):
            category = random.choice(categories)
            product = Product.objects.create(
                name=fake.unique.catch_phrase(),
                description=fake.text(max_nb_chars=200),
                price=round(random.uniform(10, 1000), 2),
                cost_price=round(random.uniform(5, 500), 2),
                category=category,
                quantity_in_stock=random.randint(0, 100),
                is_in_stock=random.choice([True, False]),
                status=random.choice(['draft', 'published', 'archived']),
            )
            self.stdout.write(self.style.SUCCESS(f'Created product: {product.name}'))

        self.stdout.write(self.style.SUCCESS('Fake data creation completed!'))