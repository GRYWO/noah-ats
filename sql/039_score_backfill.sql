-- ===========================================
-- Backfill kandidaten.score uit cv_geparseerd.ai_score
-- Voor bestaande kandidaten waarvan de CV al door AI is geparsed,
-- maar waarvan score nog null/0 is.
-- ===========================================

update public.kandidaten
set score = ((cv_geparseerd->>'ai_score')::int)
where (score is null or score = 0)
  and cv_geparseerd is not null
  and cv_geparseerd ? 'ai_score'
  and (cv_geparseerd->>'ai_score') ~ '^[0-9]+$';
