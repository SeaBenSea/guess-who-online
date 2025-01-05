-- Create admin_logs table
create table if not exists
  public.admin_logs (
    id uuid default gen_random_uuid () primary key,
    action_type text not null, -- e.g., 'room_deletion', 'admin_role_change', 'character_deletion'
    performed_by uuid references auth.users (id) not null,
    target_id text, -- ID of the affected resource (room_id, user_id, character_id etc.)
    target_type text not null, -- e.g., 'room', 'user', 'character'
    details jsonb, -- Additional context about the action
    created_at timestamp with time zone default timezone ('utc'::text, now()) not null
  );

-- Index for faster queries
create index if not exists admin_logs_performed_by_idx on public.admin_logs (performed_by);

create index if not exists admin_logs_action_type_idx on public.admin_logs (action_type);

create index if not exists admin_logs_created_at_idx on public.admin_logs (created_at);

-- Enable RLS
alter table public.admin_logs enable row level security;

-- Policies
-- Only admins can view logs
create policy "Allow admins to view logs" on public.admin_logs for
select
  to authenticated using (
    (
      EXISTS (
        SELECT
          (
            auth.uid () IN (
              SELECT
                users.id
              FROM
                auth.users
              WHERE
                (
                  (users.raw_user_meta_data ->> 'is_admin'::text) = 'true'::text
                )
            )
          )
      )
    )
  );

-- Only admins can insert logs
create policy "Allow admins to insert logs" on public.admin_logs for insert to authenticated
with
  check (
    (
      EXISTS (
        SELECT
          (
            auth.uid () IN (
              SELECT
                users.id
              FROM
                auth.users
              WHERE
                (
                  (users.raw_user_meta_data ->> 'is_admin'::text) = 'true'::text
                )
            )
          )
      )
    )
  );
