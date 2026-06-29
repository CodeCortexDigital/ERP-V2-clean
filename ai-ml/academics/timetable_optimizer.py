import random
import uuid
from django.apps import apps
from django.db import transaction

class TimetableSchedule:
    """Represents a candidate timetable schedule in the GA population."""
    def __init__(self, slots: list):
        self.slots = slots  # List of dicts representing schedule assignments
        self.fitness = 0.0

def calculate_fitness(schedule: TimetableSchedule, class_sizes: dict, teacher_avail: dict) -> float:
    """
    Computes fitness score. Starts at 1000.
    Deducts points for conflicts:
    - 100 per teacher double-booking at same day/period
    - 100 per room double-booking at same day/period
    - 100 per class/section double-booking at same day/period
    - 50 per teacher availability violation
    - 20 if classroom capacity is smaller than class size
    """
    score = 1000.0
    
    teacher_slots = {}
    room_slots = {}
    class_slots = {}
    
    for slot in schedule.slots:
        day = slot["day_of_week"]
        period_id = str(slot["period_id"])
        teacher_id = str(slot["teacher_id"])
        room_id = str(slot["classroom_id"])
        class_sub_id = str(slot["class_subject_id"])
        section_id = str(slot["section_id"]) if slot.get("section_id") else "none"
        
        time_key = (day, period_id)
        
        # 1. Teacher conflicts
        t_key = (teacher_id, time_key)
        if t_key in teacher_slots:
            score -= 100.0
        teacher_slots[t_key] = True
        
        # 2. Room conflicts
        r_key = (room_id, time_key)
        if r_key in room_slots:
            score -= 100.0
        room_slots[r_key] = True
        
        # 3. Class/Section conflicts
        c_key = (class_sub_id, section_id, time_key)
        if c_key in class_slots:
            score -= 100.0
        class_slots[c_key] = True
        
        # 4. Teacher availability check
        avail_periods = teacher_avail.get(teacher_id, {}).get(day, [])
        if avail_periods and period_id not in avail_periods:
            score -= 50.0
            
        # 5. Room capacity check
        class_ref_id = slot.get("class_ref_id")
        class_size = class_sizes.get(class_ref_id, 30)
        room_cap = slot.get("room_capacity", 30)
        if room_cap < class_size:
            score -= 20.0
            
    schedule.fitness = max(0.0, score)
    return schedule.fitness

def crossover(parent_a: TimetableSchedule, parent_b: TimetableSchedule) -> TimetableSchedule:
    """Performs single-point crossover on schedule slots."""
    size = len(parent_a.slots)
    if size <= 1:
        return TimetableSchedule(parent_a.slots.copy())
        
    point = random.randint(1, size - 1)
    child_slots = parent_a.slots[:point] + parent_b.slots[point:]
    return TimetableSchedule(child_slots)

def mutate(schedule: TimetableSchedule, classrooms: list, periods: list, weekdays: list, mutation_rate: float = 0.15):
    """Mutates schedule slots by randomly shifting days, periods, or rooms."""
    for slot in schedule.slots:
        if random.random() < mutation_rate:
            # Shift classroom or day/period randomly
            if random.random() < 0.5:
                room = random.choice(classrooms)
                slot["classroom_id"] = room.id
                slot["room_capacity"] = room.capacity
            else:
                slot["day_of_week"] = random.choice(weekdays)
                slot["period_id"] = random.choice(periods).id
                
def optimize_timetable(academic_year_id, generations: int = 50, pop_size: int = 50) -> dict:
    """
    Main Genetic Algorithm to schedule and optimize class lessons.
    Saves the final optimized conflict-free schedule to TimetableEntry in the DB.
    """
    SchoolClass = apps.get_model('education_academics', 'SchoolClass')
    Teacher = apps.get_model('education_academics', 'Teacher')
    Classroom = apps.get_model('education_academics', 'Classroom')
    Period = apps.get_model('education_academics', 'Period')
    ClassSubject = apps.get_model('education_academics', 'ClassSubject')
    TeacherSubjectAssignment = apps.get_model('education_academics', 'TeacherSubjectAssignment')
    TeacherAvailability = apps.get_model('education_academics', 'TeacherAvailability')
    TimetableEntry = apps.get_model('education_academics', 'TimetableEntry')
    Section = apps.get_model('education_academics', 'Section')
    
    # 1. Fetch available constraints and resources
    classrooms = list(Classroom.objects.filter(is_active=True))
    periods = list(Period.objects.filter(academic_year_id=academic_year_id, is_active=True, is_break=False))
    weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    
    assignments = list(TeacherSubjectAssignment.objects.filter(academic_year_id=academic_year_id, is_active=True))
    sections = list(Section.objects.all())
    
    if not classrooms or not periods or not assignments:
        return {"error": "Missing base database configurations: Classrooms, Periods, or Teacher assignments."}
        
    # Build constraint lookups
    class_sizes = {str(c.id): 30 for c in SchoolClass.objects.all()}
    
    teacher_avail = {}
    for ta in TeacherAvailability.objects.filter(academic_year_id=academic_year_id, is_available=True):
        t_id = str(ta.teacher_id)
        if t_id not in teacher_avail:
            teacher_avail[t_id] = {}
        day = ta.day_of_week.lower()
        if day not in teacher_avail[t_id]:
            teacher_avail[t_id][day] = []
        # Find which periods fit this availability
        for p in periods:
            if ta.start_time <= p.start_time and ta.end_time >= p.end_time:
                teacher_avail[t_id][day].append(str(p.id))
                
    # 2. Build task list: We must schedule a TimetableEntry for each subject-section pair
    task_slots = []
    for section in sections:
        # Get subjects for this class
        class_subjects = ClassSubject.objects.filter(class_ref=section.class_ref)
        for cs in class_subjects:
            # Find teacher assignment
            matching_assigns = [a for a in assignments if a.class_subject_id == cs.id]
            teacher_id = matching_assigns[0].teacher_id if matching_assigns else Teacher.objects.first().id
            
            task_slots.append({
                "class_subject_id": cs.id,
                "class_ref_id": str(section.class_ref_id),
                "teacher_id": teacher_id,
                "section_id": section.id,
            })
            
    # 3. Create initial population
    population = []
    for _ in range(pop_size):
        slots = []
        for task in task_slots:
            room = random.choice(classrooms)
            slots.append({
                "class_subject_id": task["class_subject_id"],
                "class_ref_id": task["class_ref_id"],
                "teacher_id": task["teacher_id"],
                "section_id": task["section_id"],
                "classroom_id": room.id,
                "room_capacity": room.capacity,
                "day_of_week": random.choice(weekdays),
                "period_id": random.choice(periods).id
            })
        population.append(TimetableSchedule(slots))
        
    # Evaluate initial population fitness
    for ind in population:
        calculate_fitness(ind, class_sizes, teacher_avail)
        
    # 4. Evolution loop
    for gen in range(generations):
        # Sort by fitness desc
        population.sort(key=lambda x: x.fitness, reverse=True)
        
        # Stop early if conflict-free timetable found
        if population[0].fitness >= 1000.0:
            break
            
        # Select top 50% as elite breeding pool
        elite_count = pop_size // 2
        elites = population[:elite_count]
        
        next_generation = elites.copy()
        
        # Breed new children to restore population size
        while len(next_generation) < pop_size:
            parent_a = random.choice(elites)
            parent_b = random.choice(elites)
            child = crossover(parent_a, parent_b)
            mutate(child, classrooms, periods, weekdays)
            calculate_fitness(child, class_sizes, teacher_avail)
            next_generation.append(child)
            
        population = next_generation
        
    # 5. Extract and save the best schedule
    population.sort(key=lambda x: x.fitness, reverse=True)
    best_schedule = population[0]
    
    with transaction.atomic():
        # Clear old timetable entries to replace with optimized ones
        TimetableEntry.objects.filter(academic_year_id=academic_year_id).delete()
        
        for slot in best_schedule.slots:
            TimetableEntry.objects.create(
                academic_year_id=academic_year_id,
                class_subject_id=slot["class_subject_id"],
                teacher_id=slot["teacher_id"],
                classroom_id=slot["classroom_id"],
                day_of_week=slot["day_of_week"],
                period_id=slot["period_id"],
                section_id=slot["section_id"]
            )
            
    return {
        "status": "success",
        "generations_run": gen + 1,
        "fitness_score": best_schedule.fitness,
        "slots_scheduled": len(best_schedule.slots),
        "conflicts_resolved": best_schedule.fitness >= 1000.0
    }
