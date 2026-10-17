-- Supabase SQL Editor에서 한 번 실행해주세요.
-- 커뮤니티에 올라온 작품(제작물) 게시물이에요.

create table if not exists community_posts (
  id uuid primary key,
  title text not null,
  description text,
  image_url text, -- 썸네일 이미지 (선택)
  glb_url text, -- 3D 파일(.glb) 주소
  author_email text not null,
  author_name text,
  created_at timestamptz not null default now()
);

create index if not exists community_posts_created_at_idx on community_posts (created_at desc);

-- 이미 예전 버전(이미지만 올리던 때)으로 표를 만들어 뒀다면 아래 두 줄도 실행해주세요.
-- (작품 올리기가 3D 파일(.glb) 업로드로 바뀌면서 glb_url 칸이 생기고, 이미지는 선택이 됐어요)
alter table community_posts add column if not exists glb_url text;
alter table community_posts alter column image_url drop not null;

-- Storage에도 별도 버킷을 만들어주세요:
-- Supabase 대시보드 → Storage → New bucket → 이름: community-assets → Public bucket 체크 → Create
