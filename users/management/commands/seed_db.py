from django.core.management.base import BaseCommand
from django.db import transaction

from experts.models import Expert
from users.models import User


class Command(BaseCommand):
    help = "Seeds the database with test users and experts"

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding database...")

        try:
            with transaction.atomic():
                # Clear existing for fresh seed if desired
                # User.objects.all().delete()  # Be careful, this deletes everything!

                # Create a main test user (Amanuel Bekele)
                main_user, created = User.objects.get_or_create(
                    phone_number="+251912345678",
                    defaults={"full_name": "Amanuel Bekele", "preferred_language": "en"},
                )
                if created:
                    main_user.set_password("password123")
                    main_user.save()
                    self.stdout.write(
                        self.style.SUCCESS(f"Created main user: {main_user.full_name}")
                    )

                # Create Experts
                experts_data = [
                    {
                        "phone": "+251900000001",
                        "name": "Elias Tadesse",
                        "title": "Senior Tax Consultant",
                        "bio": (
                            "Over 10 years of experience in Ethiopian corporate tax "
                            "and VAT regulations."
                        ),
                        "tags": ["tax", "commercial_code"],
                        "rate": 1500.00,
                        "status": "verified",
                        "availability": {"mon": ["00:00-23:59"], "tue": ["00:00-23:59"],
                         "wed": ["00:00-23:59"],
                         "thu": ["00:00-23:59"], "fri": ["00:00-23:59"],
                          "sat": ["00:00-23:59"], "sun": ["00:00-23:59"]}
                    },
                    {
                        "phone": "+251900000002",
                        "name": "Saba Alemayehu",
                        "title": "Startup Legal Advisor",
                        "bio": (
                            "Specializing in tech startup incorporations, IP registration, "
                            "and funding laws."
                        ),
                        "tags": ["startup_law", "ip_law"],
                        "rate": 1200.50,
                        "status": "verified",
                        "availability": {"mon": ["00:00-23:59"],
                         "tue": ["00:00-23:59"], "wed": ["00:00-23:59"],
                         "thu": ["00:00-23:59"], "fri": ["00:00-23:59"],
                          "sat": ["00:00-23:59"], "sun": ["00:00-23:59"]}
                    },
                    {
                        "phone": "+251900000003",
                        "name": "Dawit Mekonnen",
                        "title": "FX & Investment Specialist",
                        "bio": (
                            "Former NBE advisor helping foreign investors navigate FX laws "
                            "and repatriation."
                        ),
                        "tags": ["fx_law", "startup_law"],
                        "rate": 2500.00,
                        "status": "verified",
                        "availability": {"mon": ["00:00-23:59"], "tue": ["00:00-23:59"],
                         "wed": ["00:00-23:59"],
                         "thu": ["00:00-23:59"], "fri": ["00:00-23:59"],
                          "sat": ["00:00-23:59"], "sun": ["00:00-23:59"]}
                    },
                    {
                        "phone": "+251900000004",
                        "name": "Tigist Haile",
                        "title": "Commercial Dispute Lawyer",
                        "bio": (
                            "Expert in commercial arbitration and contract disputes under "
                            "Ethiopian law."
                        ),
                        "tags": ["commercial_code"],
                        "rate": 1800.00,
                        "status": "verified",
                        "availability": {"mon": ["00:00-23:59"], "tue": ["00:00-23:59"],
                         "wed": ["00:00-23:59"],
                         "thu": ["00:00-23:59"], "fri": ["00:00-23:59"],
                          "sat": ["00:00-23:59"], "sun": ["00:00-23:59"]}
                    },
                    {
                        "phone": "+251900000005",
                        "name": "Biniam Worku",
                        "title": "Intellectual Property Attorney",
                        "bio": (
                            "Handling trademarks, patents, and copyright infringement cases "
                            "in Ethiopia."
                        ),
                        "tags": ["ip_law"],
                        "rate": 1000.00,
                        "status": "pending",
                        "availability": {"mon": ["00:00-23:59"],
                         "tue": ["00:00-23:59"], "wed": ["00:00-23:59"],
                         "thu": ["00:00-23:59"], "fri": ["00:00-23:59"],
                          "sat": ["00:00-23:59"], "sun": ["00:00-23:59"]}
                    }
                ]

                for data in experts_data:
                    user, user_created = User.objects.get_or_create(
                        phone_number=data["phone"], defaults={"full_name": data["name"]}
                    )
                    if user_created:
                        user.set_password("expertpass123")
                        user.save()

                    _, exp_created = Expert.objects.update_or_create(
                        user=user,
                        defaults={
                            "title": data["title"],
                            "bio": data["bio"],
                            "specialty_tags": data["tags"],
                            "rate_per_session": data["rate"],
                            "verification_status": data["status"],
                            "wallet_provider": "telebirr",
                            "wallet_account_number": data["phone"],
                            "availability": data["availability"],
                        }
                    )
                    if exp_created:
                        self.stdout.write(
                            self.style.SUCCESS(f"Created expert: {user.full_name}")
                        )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(f"Updated expert: {user.full_name}")
                        )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error seeding database: {e}"))
            return

        self.stdout.write(self.style.SUCCESS("Successfully seeded database!"))
