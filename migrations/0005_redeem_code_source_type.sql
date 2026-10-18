ALTER TABLE redeem_codes
ADD COLUMN source_type TEXT NOT NULL DEFAULT 'admin'
CHECK (source_type IN ('admin', 'user_transfer'));
