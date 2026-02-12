-- Inventory Items Seed Data
-- All items belong to branch_id = 1

-- First, the 3 existing items (Omo, Wax, Car Shampoo) - upsert to fix if they exist
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Omo', 'Omo', 'detergent', 'kg', 0, 5, 400, 1),
  ('Wax', 'wax', 'wax', 'pcs', 0, 5, 200, 1),
  ('Car Shampoo', 'Shampoo', 'detergent', 'liters', 0, 5, 100, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Dashboard Polish products
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Prostar Dashboard Polish - Vanilla', 'PROSTAR-DP-VAN', 'polish', 'pcs', 4, 2, 600, 1),
  ('Prostar Dashboard Polish - Orange', 'PROSTAR-DP-ORG', 'polish', 'pcs', 4, 2, 600, 1),
  ('Prostar Dashboard Polish - Strawberry', 'PROSTAR-DP-STR', 'polish', 'pcs', 2, 2, 600, 1),
  ('Turtle Wax Dashboard Polish - Outdoor', 'TURTLE-DP-OUT', 'polish', 'pcs', 4, 2, 1250, 1),
  ('Flamingo Dashboard Polish - Peach', 'FLAM-DP-PCH', 'polish', 'pcs', 8, 3, 500, 1),
  ('Flamingo Dashboard Polish - Lemon', 'FLAM-DP-LEM', 'polish', 'pcs', 8, 3, 500, 1),
  ('Flamingo Dashboard Polish - Strawberry', 'FLAM-DP-STR', 'polish', 'pcs', 8, 3, 500, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Flamingo 650ml
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Flamingo 650ml - Lemon', 'FLAM-650-LEM', 'polish', 'pcs', 12, 3, 800, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Engine Degreaser
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Engine Degreaser', 'ENG-DEGRSR', 'chemical', 'pcs', 5, 2, 0, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = CURRENT_TIMESTAMP;

-- Flamingo Foam Cleaner
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Flamingo Foam Cleaner', 'FLAM-FOAM-CLN', 'chemical', 'pcs', 5, 2, 750, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Flamingo Deodorizer
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Flamingo Deodorizer - Vanilla', 'FLAM-DEO-VAN', 'chemical', 'pcs', 1, 2, 0, 1),
  ('Flamingo Deodorizer - Chewing Gum', 'FLAM-DEO-GUM', 'chemical', 'pcs', 1, 2, 0, 1),
  ('Flamingo Deodorizer - Cherry', 'FLAM-DEO-CHR', 'chemical', 'pcs', 1, 2, 0, 1),
  ('Flamingo Deodorizer - Lemon', 'FLAM-DEO-LEM', 'chemical', 'pcs', 1, 2, 0, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = CURRENT_TIMESTAMP;

-- Flamingo Crystal Liquid Wax
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Flamingo Crystal Liquid Wax', 'FLAM-CRYS-WAX', 'wax', 'pcs', 2, 2, 0, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = CURRENT_TIMESTAMP;

-- Flamingo Spray Paint
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Flamingo Spray Paint - Gloss', 'FLAM-SPRY-GLS', 'other', 'pcs', 2, 1, 0, 1),
  ('Flamingo Spray Paint - Matt', 'FLAM-SPRY-MAT', 'other', 'pcs', 1, 1, 0, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = CURRENT_TIMESTAMP;

-- Flamingo Furniture Polish
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Flamingo Furniture Polish', 'FLAM-FURN-POL', 'polish', 'pcs', 2, 1, 0, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = CURRENT_TIMESTAMP;

-- Flamingo Sticker Remover
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Flamingo Sticker Remover', 'FLAM-STCK-RMV', 'chemical', 'pcs', 2, 1, 0, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = CURRENT_TIMESTAMP;

-- Multi Purpose Foam Cleaner (Brown)
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Multi Purpose Foam Cleaner (Brown)', 'MP-FOAM-BRN', 'chemical', 'pcs', 1, 2, 750, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Nimbu Airfresheners Freshbags
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Nimbu Freshbags - Ocean', 'NIMBU-FB-OCN', 'other', 'pcs', 2, 2, 450, 1),
  ('Nimbu Freshbags - Strawberry', 'NIMBU-FB-STR', 'other', 'pcs', 1, 2, 450, 1),
  ('Nimbu Freshbags - Vanilla', 'NIMBU-FB-VAN', 'other', 'pcs', 2, 2, 450, 1),
  ('Nimbu Freshbags - Bubble Gum', 'NIMBU-FB-BGM', 'other', 'pcs', 1, 2, 450, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Nimbu Airfresheners Leaves
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Nimbu Leaves - Coconut', 'NIMBU-LV-COC', 'other', 'pcs', 2, 2, 250, 1),
  ('Nimbu Leaves - Strawberry', 'NIMBU-LV-STR', 'other', 'pcs', 1, 2, 250, 1),
  ('Nimbu Leaves - Peach', 'NIMBU-LV-PCH', 'other', 'pcs', 1, 2, 250, 1),
  ('Nimbu Leaves - Lemon', 'NIMBU-LV-LEM', 'other', 'pcs', 1, 2, 250, 1),
  ('Nimbu Leaves - Vanilla', 'NIMBU-LV-VAN', 'other', 'pcs', 1, 2, 250, 1),
  ('Nimbu Leaves - Orange', 'NIMBU-LV-ORG', 'other', 'pcs', 1, 2, 250, 1),
  ('Nimbu Leaves - Apple', 'NIMBU-LV-APL', 'other', 'pcs', 2, 2, 250, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Nimbu Gel
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Nimbu Gel - Vanilla', 'NIMBU-GEL-VAN', 'other', 'pcs', 1, 2, 300, 1),
  ('Nimbu Gel - Ocean', 'NIMBU-GEL-OCN', 'other', 'pcs', 2, 2, 300, 1),
  ('Nimbu Gel - Lemon', 'NIMBU-GEL-LEM', 'other', 'pcs', 2, 2, 300, 1),
  ('Nimbu Gel - Peach', 'NIMBU-GEL-PCH', 'other', 'pcs', 1, 2, 300, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Nimbu Cockpit Milk
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Nimbu Cockpit Milk - New Car', 'NIMBU-CM-NC', 'polish', 'pcs', 1, 2, 1400, 1),
  ('Nimbu Cockpit Milk - Strawberry', 'NIMBU-CM-STR', 'polish', 'pcs', 2, 2, 1400, 1),
  ('Nimbu Cockpit Milk - Lemon', 'NIMBU-CM-LEM', 'polish', 'pcs', 2, 2, 1400, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Nimbu Scratch Remover
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Nimbu Scratch Remover', 'NIMBU-SCRCH', 'chemical', 'pcs', 2, 1, 1000, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Nimbu Shoe Odor
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Nimbu Shoe Odor', 'NIMBU-SHOE', 'chemical', 'pcs', 2, 1, 0, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = CURRENT_TIMESTAMP;

-- Nimbu Tyre Foam Cleaner
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Nimbu Tyre Foam Cleaner', 'NIMBU-TYRE-FM', 'chemical', 'pcs', 5, 2, 0, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = CURRENT_TIMESTAMP;

-- Nimbu Handwax
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Nimbu Handwax', 'NIMBU-HANDWX', 'wax', 'pcs', 3, 2, 0, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = CURRENT_TIMESTAMP;

-- Aroma Therapy
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Aroma Therapy - Lavender', 'AROMA-LAV', 'other', 'pcs', 4, 2, 250, 1),
  ('Aroma Therapy - Orange', 'AROMA-ORG', 'other', 'pcs', 7, 2, 250, 1),
  ('Aroma Therapy - Mint', 'AROMA-MNT', 'other', 'pcs', 4, 2, 250, 1),
  ('Aroma Therapy - Cinnamon', 'AROMA-CIN', 'other', 'pcs', 7, 2, 250, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- DLXA
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('DLXA - Ocean', 'DLXA-OCN', 'other', 'pcs', 1, 2, 300, 1),
  ('DLXA - Citronela', 'DLXA-CIT', 'other', 'pcs', 1, 2, 300, 1),
  ('DLXA - Rose', 'DLXA-RSE', 'other', 'pcs', 1, 2, 300, 1),
  ('DLXA - Lavender', 'DLXA-LAV', 'other', 'pcs', 1, 2, 300, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Minigel
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Minigel - Lavender', 'MNGL-LAV', 'other', 'pcs', 1, 2, 300, 1),
  ('Minigel - Berry', 'MNGL-BRY', 'other', 'pcs', 1, 2, 300, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Little Vent
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Little Vent - Sweetmelon', 'LTVENT-SML', 'other', 'pcs', 2, 2, 600, 1),
  ('Little Vent - Bubblegum', 'LTVENT-BGM', 'other', 'pcs', 7, 2, 600, 1),
  ('Little Vent - New Car', 'LTVENT-NC', 'other', 'pcs', 9, 2, 600, 1),
  ('Little Vent - Cherry', 'LTVENT-CHR', 'other', 'pcs', 5, 2, 600, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Provence
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Provence - Gardenia', 'PROV-GRD', 'other', 'pcs', 1, 2, 600, 1),
  ('Provence - Royal Amber', 'PROV-RAB', 'other', 'pcs', 2, 2, 600, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Sameli
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Sameli - Strawberry', 'SAMELI-STR', 'other', 'pcs', 2, 2, 600, 1),
  ('Sameli - Encounter', 'SAMELI-ENC', 'other', 'pcs', 4, 2, 600, 1),
  ('Sameli - Vanilla', 'SAMELI-VAN', 'other', 'pcs', 3, 2, 600, 1),
  ('Sameli - Black Ice', 'SAMELI-BIC', 'other', 'pcs', 2, 2, 600, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Car Perfume
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Car Perfume - Rose', 'CPERF-RSE', 'other', 'pcs', 3, 2, 380, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Parya Sprays
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Parya Spray - Lavender', 'PARYA-LAV', 'other', 'pcs', 1, 2, 250, 1),
  ('Parya Spray - Rose', 'PARYA-RSE', 'other', 'pcs', 1, 2, 250, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Odor X
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Odor X - Cherry', 'ODORX-CHR', 'chemical', 'pcs', 1, 1, 1200, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Car Mats
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Car Mat - 3pc Set', 'CMAT-3PC', 'other', 'sets', 3, 1, 3000, 1),
  ('Car Mat - 4pc Set', 'CMAT-4PC', 'other', 'sets', 3, 1, 3500, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_cost = EXCLUDED.unit_cost,
  updated_at = CURRENT_TIMESTAMP;

-- Detailing Products
INSERT INTO inventory_items (name, sku, category, unit, quantity, reorder_level, unit_cost, branch_id)
VALUES
  ('Detailing Soap', 'DTL-SOAP', 'detergent', 'pcs', 5, 2, 0, 1),
  ('Flamingo Headlight Restorer', 'FLAM-HDLGHT', 'chemical', 'pcs', 2, 1, 0, 1),
  ('Scratch Remover Chinku', 'SCRCH-CHNK', 'chemical', 'pcs', 1, 1, 0, 1),
  ('Plastic Restorer', 'PLSTC-REST', 'chemical', 'pcs', 2, 1, 0, 1),
  ('Flamingo Leather Cleaner', 'FLAM-LTHR-CLN', 'chemical', 'pcs', 1, 1, 0, 1),
  ('Flamingo Glass Restorer', 'FLAM-GLASS-RST', 'chemical', 'pcs', 1, 1, 0, 1),
  ('Wash and Wax', 'WSH-WAX', 'wax', 'pcs', 1, 1, 0, 1),
  ('Flamingo Freshener - Coco', 'FLAM-FR-COCO', 'other', 'pcs', 10, 5, 0, 1),
  ('Flamingo Freshener - Dark Ice', 'FLAM-FR-DICE', 'other', 'pcs', 26, 5, 0, 1),
  ('Flamingo Freshener - Oud', 'FLAM-FR-OUD', 'other', 'pcs', 22, 5, 0, 1),
  ('Flamingo Tyre Shine', 'FLAM-TYRE-SHN', 'chemical', 'pcs', 1, 1, 0, 1),
  ('Sponge', 'SPONGE-001', 'sponge', 'pcs', 2, 2, 0, 1),
  ('Rubbing Compound', 'RUB-CMPND', 'chemical', 'pcs', 1, 1, 0, 1)
ON CONFLICT (branch_id, sku) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = CURRENT_TIMESTAMP;
