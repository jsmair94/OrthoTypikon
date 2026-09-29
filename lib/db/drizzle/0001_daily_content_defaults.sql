WITH utc_year AS (
  SELECT date_trunc('year', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date AS start_date
),
content_dates AS (
  SELECT generate_series(
    utc_year.start_date,
    (utc_year.start_date + INTERVAL '1 year' + INTERVAL '13 days')::date,
    INTERVAL '1 day'
  )::date AS content_date
  FROM utc_year
)
INSERT INTO public.daily_content (
  id,
  content_date,
  calendar_system,
  locale,
  publication_status,
  verse_reference,
  verse_text,
  verse_author,
  feast_title,
  feast_description,
  reading_title,
  reading_reference,
  reading_duration_minutes
)
SELECT
  'daily-' || content_dates.content_date::text,
  content_dates.content_date,
  'gregorian',
  'ar',
  'published',
  'يوحنا ١٤:٢٧',
  'سلامي أترك لكم. سلامي أعطيكم. ليس كما يعطي العالم أعطيكم أنا.',
  'الإنجيل بحسب القديس يوحنا',
  CASE
    WHEN content_dates.content_date = DATE '2026-08-25' THEN 'رقاد والدة الإله'
    WHEN content_dates.content_date = DATE '2026-08-26' THEN NULL
    ELSE calendar_entries.feast_title
  END,
  CASE
    WHEN content_dates.content_date = DATE '2026-08-25'
      THEN 'تذكار مبارك نعيشه اليوم مع الكنيسة الجامعة'
    ELSE NULL
  END,
  'إنجيل متى',
  'الإصحاح الخامس',
  8
FROM content_dates
LEFT JOIN public.calendar_entries AS calendar_entries
  ON calendar_entries.gregorian_date = content_dates.content_date
  AND calendar_entries.calendar_system = 'gregorian'
  AND calendar_entries.locale = 'ar'
  AND calendar_entries.publication_status = 'published'
ON CONFLICT DO NOTHING;