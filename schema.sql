-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 5.1 cities
create table cities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- 5.2 categories
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- 5.3 partners
create table partners (
  id uuid primary key default uuid_generate_v4(),
  business_name text not null,
  city_id uuid references cities(id),
  category_id uuid references categories(id),
  address text,
  phone text,
  email text,
  instagram text,
  website text,
  logo_url text,
  description text,
  active boolean default true,
  featured boolean default false,
  validation_token text unique not null,
  created_at timestamptz default now()
);

-- View para exponer comerciales sin el token de validación al front
create view public_partners as
select id, business_name, city_id, category_id, address, phone, email, instagram, website, logo_url, description, active, featured, created_at
from partners
where active = true;

-- 5.4 benefits
create table benefits (
  id uuid primary key default uuid_generate_v4(),
  partner_id uuid references partners(id) on delete cascade,
  title text not null,
  description text,
  discount_type text,
  discount_value numeric,
  conditions text,
  active boolean default true,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- 5.5 plans
create table plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price_clp integer not null,
  billing_cycle text not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- 5.6 members
create table members (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text,
  phone text,
  rut text not null,
  rut_normalized text unique not null,
  city_id uuid references cities(id),
  plan_id uuid references plans(id),
  status text not null default 'pending',
  start_date date,
  renewal_date date,
  accepted_terms_at timestamptz,
  accepted_privacy_at timestamptz,
  marketing_opt_in boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5.7 validation_logs
create table validation_logs (
  id uuid primary key default uuid_generate_v4(),
  partner_id uuid references partners(id),
  member_id uuid references members(id),
  rut_entered text,
  result text not null,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- 5.8 benefit_uses
create table benefit_uses (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid references members(id),
  partner_id uuid references partners(id),
  benefit_id uuid references benefits(id),
  notes text,
  created_at timestamptz default now()
);

-- 9.3 Row Level Security
alter table cities enable row level security;
alter table categories enable row level security;
alter table partners enable row level security;
alter table benefits enable row level security;
alter table plans enable row level security;
alter table members enable row level security;
alter table validation_logs enable row level security;
alter table benefit_uses enable row level security;

-- Políticas de lectura para front-end público (API anon)
create policy "Public can read active cities" on cities for select to anon, authenticated using (active = true);
create policy "Public can read active categories" on categories for select to anon, authenticated using (active = true);
create policy "Public can read active benefits" on benefits for select to anon, authenticated using (active = true);
create policy "Public can read active plans" on plans for select to anon, authenticated using (active = true);

-- Las tablas sensibles (members, partners, validation_logs, benefit_uses) no tendrán políticas para anon.
-- Serán accedidas desde Cloudflare Pages Functions utilizando el service_role key, que sobrepasa el RLS por completo.

-- Permisos sobre la vista pública de partners
grant select on public_partners to anon, authenticated;

-- Datos Semilla (Pilot City & Plan)
insert into cities (name, slug) values ('Puerto Varas', 'puerto-varas');
insert into plans (name, price_clp, billing_cycle) values ('Socio Club Hogga', 4990, 'monthly');
