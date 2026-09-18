begin;

revoke all on table public.proposalflow_proposals from anon, authenticated;
grant all on table public.proposalflow_proposals to service_role;

commit;
