from django.core.management.base import BaseCommand

from services.education.academics.models import Classroom


FLOOR_MAP = {
    "Ground Floor": "ground",
    "First Floor": "first",
    "Second Floor": "second",
    "Third Floor": "third",
    "Outdoor Area": "outdoor",
}

CATEGORY_MAP = {
    "Classrooms": "classroom",
    "Laboratories": "lab",
    "Offices & Staff": "office",
    "Sports & Recreation": "sports",
    "Assembly & Halls": "hall",
    "Utility & Other": "other",
}

ROOMS = [
    {"id": "G-101", "name": "G-101", "floor": "Ground Floor", "category": "Classrooms", "capacity": 40},
    {"id": "G-102", "name": "G-102", "floor": "Ground Floor", "category": "Classrooms", "capacity": 35},
    {"id": "G-103", "name": "G-103", "floor": "Ground Floor", "category": "Classrooms", "capacity": 30},
    {"id": "G-104", "name": "G-104", "floor": "Ground Floor", "category": "Laboratories", "capacity": 25},
    {"id": "G-105", "name": "G-105", "floor": "Ground Floor", "category": "Laboratories", "capacity": 25},
    {"id": "G-106", "name": "G-106", "floor": "Ground Floor", "category": "Offices & Staff", "capacity": 10},
    {"id": "G-107", "name": "G-107", "floor": "Ground Floor", "category": "Utility & Other", "capacity": None},
    {"id": "G-108", "name": "G-108", "floor": "Ground Floor", "category": "Assembly & Halls", "capacity": 100},

    {"id": "1-101", "name": "1-101", "floor": "First Floor", "category": "Classrooms", "capacity": 45},
    {"id": "1-102", "name": "1-102", "floor": "First Floor", "category": "Classrooms", "capacity": 40},
    {"id": "1-103", "name": "1-103", "floor": "First Floor", "category": "Classrooms", "capacity": 35},
    {"id": "1-104", "name": "1-104", "floor": "First Floor", "category": "Laboratories", "capacity": 30},
    {"id": "1-105", "name": "1-105", "floor": "First Floor", "category": "Laboratories", "capacity": 20},
    {"id": "1-106", "name": "1-106", "floor": "First Floor", "category": "Offices & Staff", "capacity": 8},
    {"id": "1-107", "name": "1-107", "floor": "First Floor", "category": "Offices & Staff", "capacity": 8},
    {"id": "1-108", "name": "1-108", "floor": "First Floor", "category": "Utility & Other", "capacity": 15},

    {"id": "2-201", "name": "2-201", "floor": "Second Floor", "category": "Classrooms", "capacity": 50},
    {"id": "2-202", "name": "2-202", "floor": "Second Floor", "category": "Classrooms", "capacity": 45},
    {"id": "2-203", "name": "2-203", "floor": "Second Floor", "category": "Classrooms", "capacity": 40},
    {"id": "2-204", "name": "2-204", "floor": "Second Floor", "category": "Classrooms", "capacity": 35},
    {"id": "2-205", "name": "2-205", "floor": "Second Floor", "category": "Laboratories", "capacity": 24},
    {"id": "2-206", "name": "2-206", "floor": "Second Floor", "category": "Offices & Staff", "capacity": 6},
    {"id": "2-207", "name": "2-207", "floor": "Second Floor", "category": "Offices & Staff", "capacity": 6},
    {"id": "2-208", "name": "2-208", "floor": "Second Floor", "category": "Sports & Recreation", "capacity": None},

    {"id": "3-301", "name": "3-301", "floor": "Third Floor", "category": "Classrooms", "capacity": 60},
    {"id": "3-302", "name": "3-302", "floor": "Third Floor", "category": "Classrooms", "capacity": 55},
    {"id": "3-303", "name": "3-303", "floor": "Third Floor", "category": "Classrooms", "capacity": 50},
    {"id": "3-304", "name": "3-304", "floor": "Third Floor", "category": "Laboratories", "capacity": 30},
    {"id": "3-305", "name": "3-305", "floor": "Third Floor", "category": "Laboratories", "capacity": 20},
    {"id": "3-306", "name": "3-306", "floor": "Third Floor", "category": "Offices & Staff", "capacity": 10},
    {"id": "3-307", "name": "3-307", "floor": "Third Floor", "category": "Offices & Staff", "capacity": 6},
    {"id": "3-308", "name": "3-308", "floor": "Third Floor", "category": "Assembly & Halls", "capacity": 80},

    {"id": "O-01", "name": "Basketball Court", "floor": "Outdoor Area", "category": "Sports & Recreation", "capacity": 30},
    {"id": "O-02", "name": "Football Ground", "floor": "Outdoor Area", "category": "Sports & Recreation", "capacity": 50},
    {"id": "O-03", "name": "Tennis Court", "floor": "Outdoor Area", "category": "Sports & Recreation", "capacity": 10},
    {"id": "O-04", "name": "Outdoor Amphitheater", "floor": "Outdoor Area", "category": "Assembly & Halls", "capacity": 200},
    {"id": "O-05", "name": "Garden Area", "floor": "Outdoor Area", "category": "Sports & Recreation", "capacity": 40},
]


class Command(BaseCommand):
    help = "Seed the database with sample classrooms/rooms for timetable design."

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for room in ROOMS:
            code = room["id"]
            floor_display = room["floor"]
            category_display = room["category"]
            defaults = {
                "name": room["name"],
                "capacity": room["capacity"] if room["capacity"] is not None else 0,
                "location": floor_display,
                "floor": FLOOR_MAP.get(floor_display, ""),
                "category": CATEGORY_MAP.get(category_display, "other"),
                "is_active": True,
            }
            obj, was_created = Classroom.objects.update_or_create(
                code=code,
                defaults=defaults,
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"Classrooms seeded successfully. Created: {created}, Updated: {updated}, Total: {Classroom.objects.count()}"
        ))
