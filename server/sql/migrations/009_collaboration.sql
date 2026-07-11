-- ================================================================
-- 009_collaboration.sql
-- collab_spaces, collab_documents, collab_document_versions,
-- collab_boards, collab_board_elements, sticky_notes, reminders,
-- collab_calls, collab_call_participants, collab_whiteboards,
-- collab_whiteboard_elements, collab_whiteboard_snapshots
-- Depends on: 008
-- ================================================================

CREATE TABLE collab_spaces (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('collab_spaces');
CREATE INDEX idx_cs_project_id ON collab_spaces(project_id);

CREATE TABLE collab_documents (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_space_id   UUID              NOT NULL REFERENCES collab_spaces(id) ON DELETE CASCADE,
  created_by_id     UUID              NOT NULL REFERENCES users(id),
  title             VARCHAR(255)      NOT NULL DEFAULT 'Untitled Document',
  content           JSONB,
  status            collab_doc_status NOT NULL DEFAULT 'active',
  version           INTEGER           NOT NULL DEFAULT 1,
  last_edited_by_id UUID              REFERENCES users(id),
  last_edited_at    TIMESTAMPTZ,
  order_index       SMALLINT          NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('collab_documents');
CREATE INDEX idx_cd_space_id ON collab_documents(collab_space_id);
CREATE INDEX idx_cd_status   ON collab_documents(status) WHERE status = 'active';

CREATE TABLE collab_document_versions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID        NOT NULL REFERENCES collab_documents(id) ON DELETE CASCADE,
  version     INTEGER     NOT NULL,
  content     JSONB       NOT NULL,
  saved_by_id UUID        NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, version)
);

CREATE INDEX idx_cdv_document_id ON collab_document_versions(document_id);
CREATE INDEX idx_cdv_version     ON collab_document_versions(document_id, version DESC);

CREATE TABLE collab_boards (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_space_id UUID              NOT NULL REFERENCES collab_spaces(id) ON DELETE CASCADE,
  created_by_id   UUID              NOT NULL REFERENCES users(id),
  title           VARCHAR(255)      NOT NULL DEFAULT 'Untitled Board',
  description     TEXT,
  thumbnail_url   TEXT,
  version         INTEGER           NOT NULL DEFAULT 1,
  status          collab_doc_status NOT NULL DEFAULT 'active',
  order_index     SMALLINT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('collab_boards');
CREATE INDEX idx_cb_space_id ON collab_boards(collab_space_id);

CREATE TABLE collab_board_elements (
  id            UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id      UUID               NOT NULL REFERENCES collab_boards(id) ON DELETE CASCADE,
  created_by_id UUID               NOT NULL REFERENCES users(id),
  element_type  board_element_type NOT NULL,
  x             NUMERIC(10,2)      NOT NULL DEFAULT 0,
  y             NUMERIC(10,2)      NOT NULL DEFAULT 0,
  width         NUMERIC(10,2),
  height        NUMERIC(10,2),
  rotation      NUMERIC(6,2)       NOT NULL DEFAULT 0,
  content       TEXT,
  style         JSONB,
  data          JSONB,
  z_index       INTEGER            NOT NULL DEFAULT 0,
  source_id     UUID               REFERENCES collab_board_elements(id) ON DELETE SET NULL,
  target_id     UUID               REFERENCES collab_board_elements(id) ON DELETE SET NULL,
  is_locked     BOOLEAN            NOT NULL DEFAULT FALSE,
  is_deleted    BOOLEAN            NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('collab_board_elements');
CREATE INDEX idx_cbe_board_id ON collab_board_elements(board_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_cbe_z_index  ON collab_board_elements(board_id, z_index);

CREATE TABLE sticky_notes (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collab_space_id UUID              REFERENCES collab_spaces(id)  ON DELETE CASCADE,
  scope           sticky_note_scope NOT NULL DEFAULT 'personal',
  content         TEXT              NOT NULL,
  color           VARCHAR(20)       NOT NULL DEFAULT '#FEFF9C',
  position_x      NUMERIC(10,2),
  position_y      NUMERIC(10,2),
  is_pinned       BOOLEAN           NOT NULL DEFAULT FALSE,
  is_archived     BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_shared_scope CHECK (
    scope = 'personal' OR (scope = 'shared' AND collab_space_id IS NOT NULL)
  )
);

SELECT apply_updated_at('sticky_notes');
CREATE INDEX idx_sn_owner_id ON sticky_notes(owner_id)        WHERE is_archived = FALSE;
CREATE INDEX idx_sn_space_id ON sticky_notes(collab_space_id) WHERE scope = 'shared';

CREATE TABLE reminders (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID            NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  collab_space_id UUID            REFERENCES collab_spaces(id)    ON DELETE SET NULL,
  project_id      UUID            REFERENCES projects(id)         ON DELETE SET NULL,
  milestone_id    UUID            REFERENCES milestones(id)       ON DELETE SET NULL,
  title           VARCHAR(255)    NOT NULL,
  notes           TEXT,
  due_at          TIMESTAMPTZ     NOT NULL,
  status          reminder_status NOT NULL DEFAULT 'pending',
  sent_at         TIMESTAMPTZ,
  dismissed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('reminders');
CREATE INDEX idx_rem_owner_id ON reminders(owner_id);
CREATE INDEX idx_rem_due_at   ON reminders(due_at)     WHERE status = 'pending';
CREATE INDEX idx_rem_project  ON reminders(project_id) WHERE project_id IS NOT NULL;

CREATE TABLE collab_calls (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_space_id UUID        NOT NULL REFERENCES collab_spaces(id) ON DELETE CASCADE,
  initiated_by_id UUID        NOT NULL REFERENCES users(id),
  call_type       call_type   NOT NULL DEFAULT 'video',
  status          call_status NOT NULL DEFAULT 'initiated',
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_seconds INTEGER    CHECK (duration_seconds >= 0),
  room_id         VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('collab_calls');
CREATE INDEX idx_cc_space_id ON collab_calls(collab_space_id);
CREATE INDEX idx_cc_status   ON collab_calls(status);

CREATE TABLE collab_call_participants (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id   UUID        NOT NULL REFERENCES collab_calls(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES users(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at   TIMESTAMPTZ,
  UNIQUE (call_id, user_id)
);

CREATE INDEX idx_ccp_call_id ON collab_call_participants(call_id);
CREATE INDEX idx_ccp_user_id ON collab_call_participants(user_id);

CREATE TABLE collab_whiteboards (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id         UUID        NOT NULL UNIQUE REFERENCES collab_calls(id) ON DELETE CASCADE,
  collab_space_id UUID        NOT NULL REFERENCES collab_spaces(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('collab_whiteboards');

CREATE TABLE collab_whiteboard_elements (
  id            UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID               NOT NULL REFERENCES collab_whiteboards(id) ON DELETE CASCADE,
  drawn_by_id   UUID               NOT NULL REFERENCES users(id),
  element_type  board_element_type NOT NULL,
  x             NUMERIC(10,2)      NOT NULL DEFAULT 0,
  y             NUMERIC(10,2)      NOT NULL DEFAULT 0,
  width         NUMERIC(10,2),
  height        NUMERIC(10,2),
  rotation      NUMERIC(6,2)       NOT NULL DEFAULT 0,
  content       TEXT,
  style         JSONB,
  data          JSONB,
  z_index       INTEGER            NOT NULL DEFAULT 0,
  is_deleted    BOOLEAN            NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('collab_whiteboard_elements');
CREATE INDEX idx_cwe_whiteboard_id ON collab_whiteboard_elements(whiteboard_id) WHERE is_deleted = FALSE;

CREATE TABLE collab_whiteboard_snapshots (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id  UUID        NOT NULL REFERENCES collab_whiteboards(id) ON DELETE CASCADE,
  captured_by_id UUID        NOT NULL REFERENCES users(id),
  snapshot_url   TEXT        NOT NULL,
  elements_state JSONB,
  label          VARCHAR(255),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cws_whiteboard_id ON collab_whiteboard_snapshots(whiteboard_id);
