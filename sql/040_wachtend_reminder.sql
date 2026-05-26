-- Track wanneer een CV-reminder verstuurd is naar wachtende kandidaten
alter table public.wachtend_op_cv
  add column if not exists reminder_sent timestamptz;
