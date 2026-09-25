"""Grade calculations: category averages, weighted term grades, letters, GPA and transcripts.

Rules (the common US gradebook defaults):
* A score counts when it has points and its status is not "excused". "Missing"
  counts as zero. Assignments that don't count toward the grade are ignored.
* Category average = points earned / points possible, after dropping the
  category's N lowest scores (by percentage).
* Term grade = weighted average of the categories that have graded work, with
  the weights re-scaled to the categories in use. With no categories (or no
  weights) it is simply total points earned / possible.
* Letter and grade points come from the school's default grading scale.
* GPA: unweighted = average grade points; weighted adds +0.5 for Honors and
  +1.0 for AP/IB (capped at 5.0). Both are weighted by course credits.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

from .models import Assignment, Category, GradeBand, GradingScale, Score

ZERO = Decimal('0')
HUNDRED = Decimal('100')
LEVEL_BONUS = {'honors': Decimal('0.5'), 'advanced': Decimal('0.5'), 'ap': Decimal('1.0'), 'ib': Decimal('1.0')}

US_SCALE = [('A+', 97, 4.0), ('A', 93, 4.0), ('A-', 90, 3.7), ('B+', 87, 3.3), ('B', 83, 3.0), ('B-', 80, 2.7),
            ('C+', 77, 2.3), ('C', 73, 2.0), ('C-', 70, 1.7), ('D+', 67, 1.3), ('D', 63, 1.0), ('D-', 60, 0.7),
            ('F', 0, 0.0)]
STANDARDS_SCALE = [('4', 90, 4.0, 'Exceeds the standard'), ('3', 75, 3.0, 'Meets the standard'),
                   ('2', 60, 2.0, 'Approaching the standard'), ('1', 0, 1.0, 'Beginning')]


def q(value, places='0.01') -> Decimal:
    return Decimal(value).quantize(Decimal(places), rounding=ROUND_HALF_UP)


def default_scale() -> GradingScale:
    """The school's default scale; created on first use from its existing grade scale, or the US A–F scale."""
    scale = GradingScale.objects.filter(is_default=True).prefetch_related('bands').first()
    if scale:
        return scale
    from services.education.academics.models import GradeScale

    existing = list(GradeScale.objects.filter(is_active=True).order_by('-min_percentage'))
    if existing:
        scale = GradingScale.objects.create(name='School grading scale', kind='letter', is_default=True,
                                            passing_percent=min((g.min_percentage for g in existing
                                                                 if (g.grade or '').upper() not in ('F', 'U')), default=40))
        GradeBand.objects.bulk_create([GradeBand(scale=scale, label=g.grade, min_percent=g.min_percentage,
                                                 gpa_points=g.points or 0, description=g.description or '')
                                       for g in existing])
    else:
        scale = GradingScale.objects.create(name='US letter grades (A–F)', kind='letter', is_default=True, passing_percent=60)
        GradeBand.objects.bulk_create([GradeBand(scale=scale, label=l, min_percent=m, gpa_points=p) for l, m, p in US_SCALE])
    return GradingScale.objects.prefetch_related('bands').get(pk=scale.pk)


def band_for(scale: GradingScale, percent: Decimal | None) -> GradeBand | None:
    if percent is None:
        return None
    for band in sorted(scale.bands.all(), key=lambda b: b.min_percent, reverse=True):
        if percent >= band.min_percent:
            return band
    return None


@dataclass
class CategoryResult:
    id: str | None
    name: str
    weight: Decimal
    earned: Decimal = ZERO
    possible: Decimal = ZERO
    count: int = 0

    @property
    def percent(self) -> Decimal | None:
        return q(self.earned / self.possible * HUNDRED) if self.possible else None


@dataclass
class TermGrade:
    percent: Decimal | None
    letter: str = ''
    gpa_points: Decimal | None = None
    passing: bool | None = None
    categories: list[CategoryResult] = field(default_factory=list)
    missing: int = 0

    def as_dict(self):
        return {'percent': float(self.percent) if self.percent is not None else None, 'letter': self.letter,
                'gpa_points': float(self.gpa_points) if self.gpa_points is not None else None,
                'passing': self.passing, 'missing': self.missing,
                'categories': [{'id': c.id, 'name': c.name, 'weight': float(c.weight),
                                'percent': float(c.percent) if c.percent is not None else None, 'count': c.count}
                               for c in self.categories]}


def _counted(score: Score | None, assignment: Assignment):
    """(earned, possible) for a score, or None when it doesn't count."""
    if not assignment.counts_toward_grade or assignment.points_possible <= 0:
        return None
    if score is None or score.status == 'excused':
        return None
    if score.status == 'missing':
        return ZERO, assignment.points_possible
    if score.points is None:
        return None
    return Decimal(score.points), assignment.points_possible


def term_grade(student, class_subject, term, scale: GradingScale | None = None,
               assignments=None, scores=None, categories=None) -> TermGrade:
    """Weighted grade for one student in one class-subject and term."""
    scale = scale or default_scale()
    if assignments is None:
        assignments = list(Assignment.objects.filter(class_subject=class_subject, term=term)
                           .filter(models_section_filter(student)))
    if categories is None:
        categories = list(Category.objects.filter(class_subject=class_subject))
    if scores is None:
        scores = {s.assignment_id: s for s in Score.objects.filter(student=student, assignment__in=assignments)}

    by_cat: dict[str | None, list[tuple[Decimal, Decimal]]] = {}
    missing = 0
    for a in assignments:
        s = scores.get(a.id)
        if s is not None and s.status == 'missing':
            missing += 1
        counted = _counted(s, a)
        if counted:
            by_cat.setdefault(str(a.category_id) if a.category_id else None, []).append(counted)

    results = []
    for c in categories:
        items = by_cat.get(str(c.id), [])
        if c.drop_lowest and len(items) > c.drop_lowest:
            items = sorted(items, key=lambda ep: ep[0] / ep[1])[c.drop_lowest:]
        r = CategoryResult(str(c.id), c.name, Decimal(c.weight))
        for e, p in items:
            r.earned += e
            r.possible += p
            r.count += 1
        results.append(r)
    loose = by_cat.get(None, [])
    if loose:
        r = CategoryResult(None, 'Other', ZERO)
        for e, p in loose:
            r.earned += e
            r.possible += p
            r.count += 1
        results.append(r)

    weighted = [r for r in results if r.possible and r.weight > 0]
    if weighted:
        total_w = sum(r.weight for r in weighted)
        percent = q(sum(r.percent * r.weight for r in weighted) / total_w)
    else:
        earned = sum(r.earned for r in results)
        possible = sum(r.possible for r in results)
        percent = q(earned / possible * HUNDRED) if possible else None

    band = band_for(scale, percent)
    return TermGrade(
        percent=percent, letter=band.label if band else '', gpa_points=band.gpa_points if band else None,
        passing=(percent >= scale.passing_percent) if percent is not None else None, categories=results, missing=missing,
    )


def models_section_filter(student):
    """Assignments for every section, or for the student's own section."""
    from django.db.models import Q

    return Q(section__isnull=True) | Q(section_id=student.current_section_id)


def gpa(entries) -> dict:
    """entries: [(gpa_points, credits, level)] → unweighted and weighted GPA (credit-weighted)."""
    rows = [(Decimal(p), Decimal(c or 1), lvl) for p, c, lvl in entries if p is not None]
    credits = sum(c for _, c, _ in rows)
    if not credits:
        return {'unweighted': None, 'weighted': None, 'credits': 0}
    unweighted = sum(p * c for p, c, _ in rows) / credits
    weighted = sum(min(p + (LEVEL_BONUS.get(lvl, ZERO) if p > 0 else ZERO), Decimal('5.0')) * c for p, c, lvl in rows) / credits
    return {'unweighted': float(q(unweighted)), 'weighted': float(q(weighted)), 'credits': float(credits)}
