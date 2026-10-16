-- UNEXPOSED 데이터베이스 표 만들기
-- 새 Supabase 프로젝트 → SQL Editor → 이 파일 내용을 통째로 붙여넣고 Run 하세요.
-- 여러 번 실행해도 괜찮아요(이미 있으면 건너뛰어요).
--
-- 2026-09-20 백업(db_cluster)의 표 구조 그대로 + 커뮤니티 표(community_posts).
-- 서버는 SUPABASE_SECRET_KEY(서비스 키)로 접속해서 RLS를 거치지 않아요.
-- 그래서 모든 표에 RLS만 켜 두고 정책은 만들지 않아요 → 브라우저(anon 키)로는 아무것도 못 읽어요.

-- 관리자 목록 (대빵이 관리자 페이지에서 추가·삭제)
create table if not exists public.admin_accounts (
  email      text primary key,
  note       text,
  added_by   text,
  created_at timestamptz not null default now()
);

-- 버그 제보
create table if not exists public.bug_reports (
  id             uuid primary key,
  description    text not null,
  page_url       text,
  reporter_email text,
  reporter_name  text,
  status         text not null default 'open',
  created_at     timestamptz not null default now()
);
create index if not exists bug_reports_created_at_idx on public.bug_reports (created_at desc);

-- 맞춤 제작 · 제작 스튜디오 주문 (체형·원단 등은 fabric_note에 글로 들어가요)
create table if not exists public.orders (
  id                bigint generated always as identity primary key,
  order_id          text not null unique,
  email             text not null,
  amount            integer not null,
  fabric_label      text,
  detail_labels     text[],
  finish_label      text,
  fabric_note       text,
  detail_note       text,
  shipping_name     text,
  shipping_phone    text,
  shipping_zipcode  text,
  shipping_address1 text,
  shipping_address2 text,
  shipping_note     text,
  shipping_consent  boolean default false,
  status            text default 'pending',
  payment_key       text,
  created_at        timestamptz default now(),
  paid_at           timestamptz,
  design_mode       text
);

-- 메인 페이지 방문 기록 (관리자 페이지 접속자 통계)
create table if not exists public.page_visits (
  id         bigint generated always as identity primary key,
  visited_at timestamptz not null default now(),
  is_admin   boolean not null default false
);
create index if not exists page_visits_visited_at_idx on public.page_visits (visited_at);

-- 구독 플랜 (한 사람당 한 줄)
create table if not exists public.subscriptions (
  email         text primary key,
  plan          text not null,
  amount        integer not null,
  subscribed_at timestamptz not null default now(),
  payment_key   text,
  order_id      text
);

-- 프로필 (이름 · 연락처 · 배송지)
create table if not exists public.user_profiles (
  email            text primary key,
  name             text not null,
  contact_email    text,
  phone            text,
  zipcode          text,
  address1         text,
  address2         text,
  shipping_consent boolean not null default false,
  updated_at       timestamptz not null default now()
);

-- 옷장 아이템 (기본 제공 + 사용자가 올린 옷)
create table if not exists public.wardrobe_items (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text not null check (category in ('top', 'bottom', 'outer', 'accessory', 'shoes', 'hair', 'makeup')),
  color         text,
  tags          text[] default '{}',
  age_groups    text[] default '{}',
  glb_url       text,
  thumbnail_url text,
  uploaded_by   text not null default 'builtin',
  created_at    timestamptz not null default now()
);

-- 커뮤니티 게시물
create table if not exists public.community_posts (
  id           uuid primary key,
  title        text not null,
  description  text,
  image_url    text not null,
  author_email text not null,
  author_name  text,
  created_at   timestamptz not null default now()
);
create index if not exists community_posts_created_at_idx on public.community_posts (created_at desc);

-- 브라우저에서 직접 접근 못 하게 RLS 켜기 (서버의 서비스 키는 영향 없음)
alter table public.admin_accounts  enable row level security;
alter table public.bug_reports     enable row level security;
alter table public.orders          enable row level security;
alter table public.page_visits     enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.user_profiles   enable row level security;
alter table public.wardrobe_items  enable row level security;
alter table public.community_posts enable row level security;
