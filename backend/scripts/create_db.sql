-- Bootstrap the local development database and role for the quiz platform.
-- Run as the postgres superuser:
--   sudo -u postgres psql < scripts/create_db.sql
--
-- Uses PEER authentication over the Unix socket: a Postgres role named after the
-- OS user ("eshhh") lets the app connect with no password and no pg_hba edits.
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'eshhh') THEN
      CREATE ROLE eshhh LOGIN SUPERUSER;
   END IF;
END
$$;

SELECT 'CREATE DATABASE quiz_platform OWNER eshhh'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'quiz_platform')\gexec

ALTER DATABASE quiz_platform OWNER TO eshhh;
