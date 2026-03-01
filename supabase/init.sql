-- ─── Roles ───────────────────────────────────────────────────────────
-- anon: PostgREST が JWT の role クレームに基づいて切り替えるロール
CREATE ROLE anon NOLOGIN NOINHERIT;

-- authenticator: PostgREST が接続に使うロール（anon に切り替え可能）
CREATE ROLE authenticator LOGIN PASSWORD 'authenticator-password' NOINHERIT;
GRANT anon TO authenticator;

-- ─── Schema 権限 ─────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon;

-- ─── テーブル ────────────────────────────────────────────────────────
CREATE TABLE public.sessions (
    id   TEXT  PRIMARY KEY,
    data JSONB NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO anon;
