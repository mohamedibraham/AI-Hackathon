import re

from helpers.logger import get_logger

logger = get_logger("safety")


BP_READING_PATTERN = re.compile(r"(\d{2,3})\s*/\s*(\d{2,3})")
EMERGENCY_SYSTOLIC_THRESHOLD = 180
EMERGENCY_DIASTOLIC_THRESHOLD = 120


PERSONAL_CONTEXT_PATTERN = re.compile(
    r"\b(my|i'?m|i am|i have|i've)\b|ضغطي|أنا|عندي|جسمي",
    re.IGNORECASE,
)


def _bp_reading_indicates_emergency(query: str) -> bool:
    
    has_reading = False
    for systolic_str, diastolic_str in BP_READING_PATTERN.findall(query):
        systolic, diastolic = int(systolic_str), int(diastolic_str)
        if systolic >= EMERGENCY_SYSTOLIC_THRESHOLD or diastolic >= EMERGENCY_DIASTOLIC_THRESHOLD:
            has_reading = True
            break
    if not has_reading:
        return False
    return bool(PERSONAL_CONTEXT_PATTERN.search(query))


EMERGENCY_PATTERNS = [
    r"chest pain", r"ألم(?:\s+شديد)?\s+في\s+الصدر", r"وجع.*صدر",
    r"can'?t breathe", r"صعوبة (شديدة )?في التنفس", r"مش قادر اتنفس",
    r"losing consciousness", r"فقدان الوعي", r"غيبوبة", r"إغماء",
    r"stroke", r"سكتة دماغية", r"شلل مفاجئ",
    r"blood pressure (over|above) \d{3}", r"ضغط.*(?:فوق|أعلى من)\s*\d{2,3}",
    r"severe headache", r"صداع شديد مفاجئ",
    r"suicide", r"انتحار", r"أأذي نفسي",
    r"\bemergency\b", r"حالة طارئة", r"إسعاف",
]

CAUTION_PATTERNS = [
    r"my (blood pressure|bp) is\s*\d", r"ضغطي\s*\d", r"ضغط.*عندي.*\d",
    r"pregnan", r"حامل", r"حمل",
    r"what dose should i", r"جرعتي", r"جرعة\s+.*لي\b",
    r"\b(child|kid|infant)\b", r"طفل(ي|ة)?",
    r"i (feel|have)\b.*\bmy\b",
]

_EMERGENCY_RE = [re.compile(p, re.IGNORECASE) for p in EMERGENCY_PATTERNS]
_CAUTION_RE = [re.compile(p, re.IGNORECASE) for p in CAUTION_PATTERNS]


def classify_input(query: str) -> str:
    if _bp_reading_indicates_emergency(query):
        logger.warning(f"REJECT (BP reading >= {EMERGENCY_SYSTOLIC_THRESHOLD}/{EMERGENCY_DIASTOLIC_THRESHOLD}): {query!r}")
        return "reject"

    for pat in _EMERGENCY_RE:
        if pat.search(query):
            logger.warning(f"REJECT (matched emergency pattern {pat.pattern!r}): {query!r}")
            return "reject"

    for pat in _CAUTION_RE:
        if pat.search(query):
            logger.info(f"CAUTION (matched pattern {pat.pattern!r}): {query!r}")
            return "caution"

    logger.info(f"ALLOWED: {query!r}")
    return "allowed"


EMERGENCY_REDIRECT_MESSAGE = (
    "هذا السؤال يشير لاحتمال حالة طارئة. هذا النظام مصدر معلومات إرشادية "
    "عامة فقط وليس بديلاً عن تقييم طبي عاجل — لو الأعراض شديدة أو مفاجئة، "
    "تواصل فورًا مع خدمات الطوارئ أو أقرب مستشفى."
)

CAUTION_PREFIX = (
    " هذا سؤال يتعلق بحالة شخصية محددة (جرعة/حمل/طفل/قراءة ضغط فعلية). "
    "الإجابة التالية إرشاد عام من المصادر الرسمية فقط، ولازم تُناقَش مع "
    "طبيب مباشرة قبل أي قرار علاجي. "
)