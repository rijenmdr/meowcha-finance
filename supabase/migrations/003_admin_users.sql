-- Migration: Add admin_users table for authentication
-- This migration creates the admin_users table to store admin credentials
-- instead of using environment variables.

create table if not exists admin_users (
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  password_hash text not null,
  created_at timestamp not null default now()
);

alter table admin_users enable row level security;
