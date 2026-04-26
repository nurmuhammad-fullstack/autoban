CREATE TABLE IF NOT EXISTS car_models (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS parts (
  id         SERIAL PRIMARY KEY,
  name       TEXT             NOT NULL,
  code       TEXT             NOT NULL UNIQUE,
  model_id   INTEGER          REFERENCES car_models(id) ON DELETE RESTRICT,
  stock      INTEGER          NOT NULL DEFAULT 0,
  price      NUMERIC(12, 2)   NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id         SERIAL PRIMARY KEY,
  part_id    INTEGER          REFERENCES parts(id) ON DELETE SET NULL,
  part_name  TEXT             NOT NULL,
  model_name TEXT             NOT NULL,
  price      NUMERIC(12, 2)   NOT NULL,
  sold_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- Default models
INSERT INTO car_models (name) VALUES ('ID.4'), ('ID.6'), ('C11'), ('L9')
  ON CONFLICT (name) DO NOTHING;

-- Default parts
INSERT INTO parts (name, code, model_id, stock, price)
VALUES
  ('Old fara Matrix LED',    'AZ-ID4-001', (SELECT id FROM car_models WHERE name='ID.4'), 2,  450),
  ('L9 asosiy akkumulyator', 'AZ-L9-020',  (SELECT id FROM car_models WHERE name='L9'),   5,  1200),
  ('C11 old bamper',         'AZ-C11-007', (SELECT id FROM car_models WHERE name='C11'),   1,  300),
  ('ID.6 orqa ko''zgu',      'AZ-ID6-033', (SELECT id FROM car_models WHERE name='ID.6'), 10, 120)
ON CONFLICT (code) DO NOTHING;
